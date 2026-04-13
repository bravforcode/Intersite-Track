# TaskAm Firebase + Obsidian Handoff

## Current State

- Runtime database for the TaskAm app is now Firebase-only.
- Local `vault:*` Obsidian sync is operational and verified.
- Global Gracia Brain at `C:/Users/menum/OneDrive/Documents/Gracia/Brain` is now Firebase-backed too.
- Global Gracia Brain now has external knowledge automation for GitHub + PubMed and writes connected knowledge notes into the same Obsidian vault.
- Gracia Brain now writes to namespaced Firestore collections:
  - `gracia_brain_projects`
  - `gracia_brain_notes`
  - `gracia_brain_skills`
  - `gracia_brain_commands`
  - `gracia_brain_sessions`
  - `gracia_brain_log`
- Brain no longer depends on Supabase anywhere in active runtime/config/package files.
- Brain installer now creates `Brain/.env` from TaskAm Firebase credentials when possible.
- Brain `node_modules` is kept outside OneDrive via junction to `C:/Users/menum/.gracia-cache/brain/node_modules`.
- Brain CLI, watcher, adapters, budget, search, and Vault notes were re-verified after the Firebase migration.
- Brain knowledge sync now creates a shared AI knowledge graph under `03-Resources/AI-Knowledge`.
- Real Firebase end-to-end smoke coverage now exists via `npm run smoke:firebase`.
- The remaining external blocker is Firebase deploy IAM for rules/index deployment.
- Active repo code/docs no longer depend on Supabase/Postgres.
- Legacy backup tree `TaskAm-main2/` still exists as a backup and was not auto-deleted.

## Verified Commands

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run vault:full`
- `npm run smoke:firebase -- --base-url http://localhost:3695`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js doctor`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js sync-all`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js preflight --project taskam`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js context --project taskam --task "verify firebase automation"`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js search --project taskam --query "firebase auth" --json`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js budget --all`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js adapters status`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js knowledge sync --force --json`
- `node C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js knowledge status --json`
- `powershell -ExecutionPolicy Bypass -File C:/Users/menum/OneDrive/Documents/Gracia/Brain/install.ps1 -SkipInstall`
- `npm test` inside `C:/Users/menum/OneDrive/Documents/Gracia/Brain`

## What Works

- Signup -> Firebase Auth -> Firestore profile creation
- Login with Firebase Identity Toolkit
- Authenticated profile and role checks
- Staff read flows
- Admin write flows for departments, task types, projects, tasks, reports, holidays, and saturday schedules
- Task comments, updates, checklists, status changes, and activity logs
- CSV/PDF report export
- Obsidian vault sync, context cache, knowledge extraction, and playbook suggestion generation
- External knowledge sync from live sources:
  - GitHub repository search
  - PubMed E-utilities search + summary fetch
- Connected knowledge graph generation:
  - `03-Resources/AI-Knowledge/Maps/AI Knowledge Hub.md`
  - `03-Resources/AI-Knowledge/Maps/GitHub Repos Watchlist.md`
  - `03-Resources/AI-Knowledge/Maps/PubMed Research Watchlist.md`
  - `03-Resources/AI-Knowledge/Topics/*.md`
  - `03-Resources/AI-Knowledge/Sources/GitHub/*.md`
  - `03-Resources/AI-Knowledge/Sources/PubMed/*.md`
- Project dashboards now link directly to shared knowledge hubs and topic notes.
- Project bundles can now retrieve synced knowledge notes through the existing `brain search` / `preflight` / `context` flows.
- Brain watcher startup for TaskAm + VibeCity
- Brain global notes auto-refresh:
  - `Meta/AI/Discovery-Roots.md`
  - `Meta/AI/Automation-Policy.md`
  - `Meta/AI/Agent-Adapters.md`
  - `Meta/AI/Project-Autoload-Map.md`
  - `Meta/AI/Project-Knowledge-Map.md`
  - `Meta/AI/Token-Budget-Tracker.md`
  - `Meta/AI/Knowledge-Index.md`
  - `Meta/AI/Knowledge-Sync-Status.md`
- TaskAm dashboard safe append/update via named marker `gracia-dashboard`
- TaskAm command/skill/session notes safe update via generic `AUTO-SYNC` block
- Bundle output now has explicit knowledge retrieval behavior:
  - `preflight.md` can emit `[know] ...` lines for relevant external knowledge notes
  - `latest.md` has a dedicated `## Knowledge` section
- Brain watcher now also watches knowledge config changes and runs periodic knowledge refresh checks.

## Important Repo Files

- App Firebase config: `src/lib/firebase.ts`
- Server Firebase admin config: `server/config/firebase-admin.ts`
- Smoke runner: `scripts/smoke-firebase-e2e.ts`
- Obsidian sync entrypoint: `scripts/obsidian-sync.ts`
- Vault config: `scripts/config/sync.config.ts`
- Playbook suggestion engine: `scripts/lib/playbook-suggester.ts`
- Vault writer: `scripts/lib/vault-writer.ts`
- Brain CLI: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/bin/brain-cli.js`
- Brain runtime: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/brain.js`
- Brain Firestore data layer: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/db.js`
- Brain Obsidian automation: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/obsidian.js`
- Brain knowledge automation: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/knowledge.js`
- Brain topic config: `C:/Users/menum/OneDrive/Documents/Gracia/Brain/config/knowledge-topics.json`
- Brain search/budget/playbooks: 
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/search.js`
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/budget.js`
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/lib/playbooks.js`
- Brain installer/bootstrap:
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/install.ps1`
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/bootstrap-taskam.js`
  - `C:/Users/menum/OneDrive/Documents/Gracia/Brain/bootstrap-vibecity.js`

## Remaining External Work

- Deploy Firestore rules and indexes with a principal that has:
  - `datastore.indexes.create`
  - `datastore.indexes.update`
  - `datastore.indexes.delete`
  - permission to access `firestore.googleapis.com`
- Verified on 2026-04-10 that the current service account from local `.env` does not have enough IAM to deploy.
- The exact failing surfaces were:
  - `cloudresourcemanager.projects.testIamPermissions`
  - `serviceusage.services.get` for `firestore.googleapis.com`
- If the backup copy `TaskAm-main2/` is no longer needed, archive or delete it deliberately outside this handoff.

## Notes About Obsidian

- `Playbook-Suggestions.md` is now written through a marker-safe auto section named `gracia-playbooks`.
- Manual content outside that marker is preserved.
- If older vault notes predate the marker, the new block is appended safely instead of overwriting the file.
- For TaskAm specifically, repo-local `.vaultsync` automation is treated as the owner of `Playbook-Suggestions.md`.
- Global Gracia Brain still computes playbook suggestions, but it does not overwrite TaskAm's repo-managed playbook note anymore.
- The vault is now a single shared second-brain surface:
  - `01-Projects/*` keeps project dashboards and context notes
  - `Meta/AI/*` keeps control-plane status and automation summaries
  - `03-Resources/AI-Knowledge/*` keeps shared external knowledge and topic maps
- The knowledge graph is intentionally link-dense:
  - project dashboards -> knowledge hub + topic notes
  - topic notes -> source notes + project dashboards + watchlists
  - source notes -> topic notes + knowledge hub
  - global AI notes -> knowledge index + sync status + project registry notes + project knowledge map
- Current live knowledge snapshot after sync on 2026-04-10:
  - 7 topic notes
  - 24 GitHub source notes
  - 16 PubMed source notes
  - 0 sync errors
