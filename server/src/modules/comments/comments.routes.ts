import { Router } from 'express';
import { CommentController } from './comments.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { createCommentSchema, updateCommentSchema, listCommentsSchema } from './comments.dto';

const router = Router();
const ctrl = new CommentController();

router.get('/', authenticate, validateRequest(listCommentsSchema, 'query'), ctrl.list);
router.post('/', authenticate, validateRequest(createCommentSchema), ctrl.create);
router.patch('/:id', authenticate, validateRequest(updateCommentSchema), ctrl.update);
router.delete('/:id', authenticate, ctrl.delete);

export default router;