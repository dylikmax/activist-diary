import { Router } from 'express';
import { TaskController } from './tasks.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireMinRole } from '../../shared/middlewares/rbac.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { createTaskSchema, updateTaskSchema, changeStatusSchema, listTasksSchema } from './tasks.dto';

const router = Router();
const ctrl = new TaskController();

// Все маршруты требуют аутентификации
router.get('/', authenticate, validateRequest(listTasksSchema, 'query'), ctrl.list);
router.post('/', authenticate, requireMinRole(0), validateRequest(createTaskSchema), ctrl.create);
router.get('/:id', authenticate, ctrl.getOne);
router.patch('/:id', authenticate, validateRequest(updateTaskSchema), ctrl.update);
router.patch('/:id/status', authenticate, validateRequest(changeStatusSchema), ctrl.changeStatus);
router.delete('/:id', authenticate, ctrl.delete);

export default router;