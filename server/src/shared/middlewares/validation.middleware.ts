import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpError } from '../utils/http-error';

export type ValidationTarget = 'body' | 'query' | 'params';

export function validateRequest(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.issues.map((err) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
      }));

      throw new HttpError(400, 'VALIDATION_ERROR', `Invalid request ${target}`, details);
    }

    // ✅ Безопасно прикрепляем валидированные данные
    const targetKey = target === 'query' ? 'validatedQuery' : target;
    (req as Record<string, unknown>)[targetKey] = result.data;
    next();
  };
}