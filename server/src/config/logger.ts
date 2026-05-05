import winston from 'winston';
import { env } from './env';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
      })
);

const transports: winston.transport[] = [new winston.transports.Console()];
if (env.NODE_ENV === 'production') {
  transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format,
  transports,
  exitOnError: false,
});

export default logger;