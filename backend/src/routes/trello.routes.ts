import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getConfigHandler,
  saveConfigHandler,
  testConnection,
  getBoardLists,
  getBoardMembers,
  getStatusMappingsHandler,
  saveStatusMappingsHandler,
  getUserMappingsHandler,
  saveUserMappingsHandler,
  getSyncLogsHandler,
  retrySyncForTask,
  seedWeeklyProgressToBoard,
  webhookHandler,
} from '../controllers/trello.controller.js';

const router = Router();

// Webhook routes — no auth (Trello calls these externally)
router.head('/webhook', (_req, res) => res.sendStatus(200));
router.post('/webhook', webhookHandler);

router.use(requireAuth);

router.get('/config', getConfigHandler);
router.post('/config', saveConfigHandler);
router.post('/test-connection', testConnection);
router.get('/board/lists', getBoardLists);
router.get('/board/members', getBoardMembers);
router.get('/status-mappings', getStatusMappingsHandler);
router.post('/status-mappings', saveStatusMappingsHandler);
router.get('/user-mappings', getUserMappingsHandler);
router.post('/user-mappings', saveUserMappingsHandler);
router.get('/sync-logs', getSyncLogsHandler);
router.post('/retry/:taskId', retrySyncForTask);
router.post('/seed-weekly-progress', seedWeeklyProgressToBoard);

export default router;
