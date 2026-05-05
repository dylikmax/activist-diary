import mysql from 'mysql2/promise';
import { dbConfig } from '../config/db';
import logger from '../config/logger';

let pool: mysql.Pool | null = null;

export function getConnectionPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info('MySQL connection pool initialized');
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnectionPool().getConnection();
    await conn.ping();
    conn.release();
    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    // 👇 ВЫВОДИМ ПОЛНУЮ ИНФОРМАЦИЮ ОБ ОШИБКЕ
    const err = error as Error & { code?: string; errno?: number; sqlMessage?: string };
    logger.error('❌ Database connection failed:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    });
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

process.on('SIGINT', () => {
  closeConnection().finally(() => process.exit(0));
});