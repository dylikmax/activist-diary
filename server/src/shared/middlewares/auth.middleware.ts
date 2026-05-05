import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt';
import { HttpError } from '../utils/http-error';
import { JwtPayload } from '../interfaces/jwt.interface';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;
  
  if (!token) {
    throw new HttpError(401, 'MISSING_TOKEN', 'Authentication required. No access token provided.');
  }

  try {
    const payload = jwt.verify(token, jwtConfig.access.secret);
    req.user = payload as JwtPayload;
    
    // Дополнительная проверка статуса (на случай блокировки в процессе сессии)
    if (req.user.status !== 'active') {
      throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Your account is inactive or blocked.');
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Access token expired. Please refresh or re-login.');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'INVALID_TOKEN', 'Invalid access token format.');
    }
    throw err;
  }
}