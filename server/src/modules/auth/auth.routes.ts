import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.dto';

const router = Router();
const controller = new AuthController();

router.post('/register', validateRequest(registerSchema), controller.register);
router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', validateRequest(refreshTokenSchema), controller.refresh);
router.post('/forgot-password', controller.forgotPassword);

export default router;