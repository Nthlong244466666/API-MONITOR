import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { executionRateLimit } from '../middleware/executionLimit.middleware.js';
import { execute } from '../controllers/execution.controller.js';
import { index, show, store, update, destroy } from '../controllers/request.controller.js';
import { listAssertions, createAssertion, patchAssertion, removeAssertion } from '../controllers/assertion.controller.js';
import { listExecutions, showExecution } from '../controllers/history.controller.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', index);
router.post('/', store);
router.get('/:requestId', show);
router.patch('/:requestId', update);
router.delete('/:requestId', destroy);
router.post('/:requestId/execute', executionRateLimit, execute);

// All routes remain nested under an authenticated workspace/project/request.
router.get('/:requestId/assertions', listAssertions);
router.post('/:requestId/assertions', createAssertion);
router.patch('/:requestId/assertions/:assertionId', patchAssertion);
router.delete('/:requestId/assertions/:assertionId', removeAssertion);
router.get('/:requestId/executions', listExecutions);
router.get('/:requestId/executions/:executionId', showExecution);

export default router;
