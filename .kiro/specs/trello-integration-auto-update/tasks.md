# Implementation Plan: Trello Integration Auto-Update

## Overview

Implement Trello integration that automatically syncs task data to Trello boards. Uses Express + TypeScript backend with PostgreSQL, and React + TypeScript frontend. Follows the existing project patterns in `server/controllers/`, `server/routes/`, `server/database/`, and `src/components/`.

## Tasks

- [x] 1. Database schema migration for Trello tables
  - Add Trello tables to `server/database/init.ts`: `trello_config`, `trello_card_mappings`, `trello_status_mappings`, `trello_user_mappings`, `trello_sync_logs`
  - Add indexes: `idx_sync_logs_task_id`, `idx_sync_logs_status`, `idx_sync_logs_created_at`, `idx_card_mappings_task_id`, `idx_card_mappings_trello_card_id`
  - Add auto-cleanup query for logs older than 30 days (scheduled via setInterval on server start)
  - _Requirements: 1.4, 2.4, 12.2, 12.5, 12.6_

- [x] 2. TypeScript types for Trello integration
  - Create `server/types/trello.ts` with interfaces: `TrelloConfig`, `TrelloCardMapping`, `TrelloStatusMapping`, `TrelloUserMapping`, `TrelloSyncLog`, `TrelloCard`, `TrelloList`, `TrelloMember`, `TrelloChecklist`, `SyncJob`, `SyncResult`
  - Create `src/types/trello.ts` with frontend-facing types for settings, sync status, and log display
  - _Requirements: 1.1, 2.4, 11.1, 12.2_

- [x] 3. Trello API Client service
  - Create `server/services/trelloApiClient.ts` implementing `TrelloAPIClient` class
  - Implement card CRUD: `createCard`, `updateCard`, `deleteCard`, `getCard`
  - Implement member ops: `addMemberToCard`, `removeMemberFromCard`
  - Implement checklist ops: `createChecklist`, `addCheckItem`, `updateCheckItem`, `deleteCheckItem`
  - Implement label ops: `addLabelToCard`, `removeLabelFromCard`
  - Implement board ops: `getBoardLists`, `getBoardMembers`
  - Implement webhook ops: `createWebhook`, `deleteWebhook`
  - All requests use HTTPS via `fetch` with `apiKey` and `token` as query params
  - _Requirements: 1.5, 2.3, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 9.1_

  - [ ]* 3.1 Write unit tests for TrelloAPIClient
    - Test card creation with correct payload shape
    - Test error handling when Trello returns 4xx/5xx
    - _Requirements: 1.3, 8.5_

- [x] 4. Database queries for Trello tables
  - Create `server/database/queries/trello.queries.ts`
  - Implement: `getConfig`, `saveConfig`, `getCardMapping`, `saveCardMapping`, `deleteCardMapping`, `getStatusMappings`, `saveStatusMapping`, `getUserMappings`, `saveUserMapping`, `createSyncLog`, `updateSyncLog`, `getSyncLogs`, `deleteOldLogs`
  - _Requirements: 1.1, 1.4, 2.4, 2.6, 4.1, 6.1, 12.1, 12.2_

- [x] 5. Trello Sync Service with retry logic
  - Create `server/services/trelloSyncService.ts` implementing `TrelloSyncService` class
  - Implement `syncTaskCreation(task)`: create card, save mapping, sync members, checklist, labels
  - Implement `syncTaskUpdate(task, changes)`: update card basic info, move list on status change, update labels on priority change
  - Implement `syncTaskDeletion(taskId, trelloCardId)`: delete card, remove mapping
  - Implement `syncMembers(task, cardId)`: diff current vs Trello members, add/remove accordingly; skip users without Trello mapping and log
  - Implement `syncChecklist(task, cardId)`: create/update checklist items
  - Implement `syncStatus(task, cardId)`: move card to mapped list
  - Implement `syncLabels(task, cardId)`: update priority label
  - Implement retry logic: max 3 retries with 30-second delay; on final failure log error and (future) notify admin
  - Decrypt API credentials before use (use `crypto` module with AES-256)
  - _Requirements: 3.1–3.6, 4.2–4.5, 5.1–5.6, 6.1–6.5, 7.1–7.5, 8.1–8.6_

  - [ ]* 5.1 Write unit tests for TrelloSyncService retry logic
    - Test that failed sync retries up to 3 times
    - Test that sync log is updated to `failed` after max retries
    - _Requirements: 8.5, 8.6_

- [x] 6. Trello settings API routes and controller
  - Create `server/controllers/trello.controller.ts` with handlers:
    - `getConfig`: return decrypted-safe config (mask credentials)
    - `saveConfig`: validate + encrypt credentials, save to DB
    - `testConnection`: call Trello API to verify credentials
    - `getBoardLists`: fetch lists from Trello board
    - `getBoardMembers`: fetch members from Trello board
    - `getStatusMappings` / `saveStatusMappings`
    - `getUserMappings` / `saveUserMappings`
    - `getSyncLogs`: with filters (date, status, task_id), paginated
    - `retrySyncForTask`: manually trigger sync for a task
  - Create `server/routes/trello.routes.ts` with routes under `/api/trello`
  - Register routes in `server/routes/index.ts`
  - Protect all routes with `auth.middleware`
  - _Requirements: 1.1–1.4, 10.1–10.8, 11.7, 12.3, 12.4_

- [x] 7. Webhook handler for two-way sync
  - Add `POST /api/trello/webhook` route (no auth middleware — Trello calls this)
  - Create `server/services/trelloWebhookHandler.ts` implementing `TrelloWebhookHandler`
  - Handle `updateCard` action: sync title/desc/due back to task
  - Handle `updateCheckItemStateOnCard`: update checklist item in DB
  - Handle `addMemberToCard` / `removeMemberFromCard`: update task assignments
  - Implement loop prevention: track recently-processed event IDs in memory (Set with TTL)
  - Only process events when `enable_two_way_sync` is true in config
  - _Requirements: 9.1–9.5_

  - [ ]* 7.1 Write unit tests for webhook loop prevention
    - Test that events originating from the system are ignored
    - Test that duplicate event IDs are deduplicated
    - _Requirements: 9.4_

- [x] 8. Integrate auto-sync triggers into existing task controller
  - Modify `server/controllers/task.controller.ts`:
    - In `createTask`: after DB insert, call `trelloSyncService.syncTaskCreation(task)` if `enable_auto_sync`
    - In `updateTask`: after DB update, call `trelloSyncService.syncTaskUpdate(task, changes)` if `enable_auto_sync`
    - In `deleteTask`: before DB delete, call `trelloSyncService.syncTaskDeletion(taskId, cardId)` if `enable_auto_sync`
    - In `updateTaskStatus`: after status update, call `trelloSyncService.syncStatus(task, cardId)` if `enable_auto_sync`
    - In `saveTaskChecklists`: after save, call `trelloSyncService.syncChecklist(task, cardId)` if `enable_auto_sync`
  - Sync calls must be non-blocking (fire-and-forget with error logging, do not delay API response)
  - _Requirements: 2.3, 2.6, 3.4–3.6, 4.2–4.3, 5.2–5.4, 6.2, 6.4, 8.1–8.4_

- [x] 9. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend types and API service
  - Create `src/services/trelloService.ts` with functions: `getConfig`, `saveConfig`, `testConnection`, `getBoardLists`, `getBoardMembers`, `getStatusMappings`, `saveStatusMappings`, `getUserMappings`, `saveUserMappings`, `getSyncLogs`, `retrySyncForTask`
  - Create `src/hooks/useTrelloConfig.ts` hook for config state management
  - Create `src/hooks/useSyncLogs.ts` hook for log fetching with filters
  - _Requirements: 10.1–10.8, 11.5, 12.3, 12.4_

- [x] 11. Trello settings page component
  - Create `src/components/settings/TrelloSettings.tsx`
  - Section 1 — Connection: inputs for API Key, Token, Board URL; "Test Connection" button; connection status badge (เชื่อมต่อแล้ว / ยังไม่เชื่อมต่อ)
  - Section 2 — Status Mapping: dropdown per task status (`pending`, `in_progress`, `completed`, `cancelled`) mapped to Trello list (fetched from board)
  - Section 3 — User Mapping: table of system users with input for Trello member ID/username
  - Section 4 — Sync Options: toggles for `enable_auto_sync` and `enable_two_way_sync`
  - Add route to settings page in `src/App.tsx` or existing settings navigation
  - _Requirements: 10.1–10.8_

  - [ ]* 11.1 Write unit tests for TrelloSettings form validation
    - Test that save is blocked when API Key or Token is empty
    - Test connection status display after test
    - _Requirements: 1.2, 1.3, 10.3, 10.4_

- [x] 12. Sync status indicator component
  - Create `src/components/tasks/TrelloSyncStatus.tsx` — icon component showing sync state:
    - Green check: `success`
    - Yellow spinner: `pending` / `retrying`
    - Red X: `failed`
  - On click: show popover/tooltip with last sync details (timestamp, action, error message if failed) and "ลองซิงค์ใหม่" button
  - Integrate `TrelloSyncStatus` into the task list row and task detail view
  - Only render when Trello integration is configured (`enable_auto_sync` is true)
  - _Requirements: 11.1–11.7_

- [x] 13. Sync logs viewer component
  - Create `src/components/settings/TrelloSyncLogs.tsx`
  - Display paginated table: timestamp, task ID/title, action, status, error message
  - Filter controls: date range picker, status select, task ID input
  - Add tab/section in Trello settings page to show this component
  - _Requirements: 12.3, 12.4_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Sync calls in task controller are fire-and-forget — never block the API response
- API credentials are encrypted with AES-256 (`crypto` module) before storing in DB
- The project uses PostgreSQL (`pg` pool), not SQLite — use `$1, $2` parameterized queries
- Two-way sync loop prevention uses an in-memory Set; restart clears it (acceptable for this scale)
- All protected routes use existing `auth.middleware.ts`
