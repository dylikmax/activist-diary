import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';
import { HttpError } from '../../shared/utils/http-error';
import { env } from '../../config/env';

export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.register(req.body);
      res.status(201).json(responseWrapper.success(null, 'Registration successful'));
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, tokens } = await this.service.login(req.body);
      
      const cookieOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
      };

      res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      res.status(200).json(responseWrapper.success(user, 'Login successful'));
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) throw new HttpError(400, 'MISSING_REFRESH_TOKEN', 'Refresh token is required');

      const tokens = await this.service.refreshTokens(token);
      res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
      
      res.status(200).json(responseWrapper.success(null, 'Token refreshed'));
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.forgotPassword(req.body.email);
      res.status(200).json(responseWrapper.success(null, 'If the email exists, a reset link has been sent'));
    } catch (err) {
      next(err);
    }
  };
}