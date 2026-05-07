import { Router } from 'express';
import { UserController } from './users.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireRole } from '../../shared/middlewares/rbac.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { listUsersSchema, updateUserSchema } from './users.dto';

const router = Router();
const ctrl = new UserController();

// 🔒 Доступ только для администрации и руководства
router.get('/', authenticate, requireRole(['admin', 'chair', 'vice_chair', 'secretary', 'dept_lead', 'subdept_lead']), validateRequest(listUsersSchema, 'query'), ctrl.list);
router.patch('/:id', authenticate, requireRole(['admin', 'chair']), validateRequest(updateUserSchema), ctrl.update);

export default router;