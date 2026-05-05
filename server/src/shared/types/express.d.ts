import { JwtPayload } from '../interfaces/jwt.interface';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Обязательно экспортируем что-то, чтобы файл считался модулем
export {};