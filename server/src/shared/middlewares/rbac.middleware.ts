import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-error';

export type Role = 'activist' | 'subdept_lead' | 'dept_lead' | 'secretary' | 'vice_chair' | 'chair' | 'admin';

// Иерархия ролей (0 = минимум, 10 = максимум)
export const ROLE_LEVELS: Record<Role, number> = {
  activist: 0,
  subdept_lead: 1,
  dept_lead: 2,
  secretary: 3, // Модератор/аудитор, не управляет отделами напрямую
  vice_chair: 4,
  chair: 5,
  admin: 10,    // Технический доступ, обходит бизнес-ограничения
};

/**
 * Проверка по явным ролям
 * @example requireRole(['dept_lead', 'chair'])
 */
export function requireRole(allowedRoles: Role | Role[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');

    // Администратор имеет доступ ко всему (можно убрать для строгого контроля)
    if (user.role === 'admin') return next();

    if (roles.includes(user.role as Role)) {
      return next();
    }

    throw new HttpError(
      403,
      'INSUFFICIENT_PERMISSIONS',
      `Access denied. Required roles: ${roles.join(', ')}. Your role: ${user.role}`
    );
  };
}

/**
 * Проверка по минимальному уровню иерархии
 * @example requireMinRole(2) // пропустит dept_lead и выше
 */
export function requireMinRole(minLevel: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');

    const userLevel = ROLE_LEVELS[user.role as Role] ?? -1;
    if (userLevel >= minLevel) return next();

    throw new HttpError(
      403,
      'INSUFFICIENT_PERMISSIONS',
      `Access denied. Minimum required level: ${minLevel}. Your level: ${userLevel}`
    );
  };
}