import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-error';
import { responseWrapper } from '../dtos/response-wrapper.dto';
import logger from '../../config/logger';
import { env } from '../../config/env';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof HttpError) {
    logger.warn(`HTTP Error [${err.statusCode}] ${err.code}: ${err.message}`, { 
      path: req.path, 
      details: err.details 
    });
    
    return res.status(err.statusCode).json(
      responseWrapper.error(err.code, err.message, err.details)
    );
  }

  // Неожиданные ошибки (500)
  logger.error('Unhandled Error:', { message: err.message, stack: err.stack });
  
  return res.status(500).json(
    responseWrapper.error(
      'INTERNAL_SERVER_ERROR',
      env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    )
  );
}