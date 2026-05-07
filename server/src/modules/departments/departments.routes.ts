import { Router } from 'express';
import { DepartmentController } from './departments.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { requireRole, requireMinRole } from '../../shared/middlewares/rbac.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { createDepartmentSchema, updateDepartmentSchema, addMemberSchema, setLeaderSchema } from './departments.dto';

const router = Router();
const ctrl = new DepartmentController();

// 🔓 Дерево отделов (доступно всем авторизованным)
router.get('/', authenticate, ctrl.getTree);

// 🔒 Создание: dept_lead и выше (уровень 2+)
router.post('/', authenticate, requireMinRole(2), validateRequest(createDepartmentSchema), ctrl.create);

router.get('/:id', authenticate, ctrl.getOne);

// 🔒 Обновление: dept_lead и выше
router.patch('/:id', authenticate, requireMinRole(2), validateRequest(updateDepartmentSchema), ctrl.update);

// 🔒 Удаление: dept_lead и выше (с проверкой на детей)
router.delete('/:id', authenticate, requireMinRole(2), ctrl.delete);

router.get('/:id/members', authenticate, ctrl.getMembers);
// 🔒 Добавить участника: dept_lead и выше
router.post('/:id/members', authenticate, requireMinRole(2), validateRequest(addMemberSchema), ctrl.addMember);

// 🔒 Удалить участника: dept_lead и выше
router.delete('/:id/members/:userId', authenticate, requireMinRole(2), ctrl.removeMember);

// 🔒 Назначить руководителя: vice_chair / chair / admin
router.put('/:id/leader', authenticate, requireRole(['vice_chair', 'chair', 'admin']), validateRequest(setLeaderSchema), ctrl.setLeader);

export default router;