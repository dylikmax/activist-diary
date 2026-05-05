import { env } from './env';

export const dbConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
  queueLimit: 0,
  timezone: 'Z', // Все даты в UTC
  dateStrings: ['DATE', 'DATETIME'], // Возвращать строки вместо Date объектов (удобнее для парсинга)
} as const;