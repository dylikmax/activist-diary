import { getConnectionPool } from './connection';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type PaginationOptions = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export class QueryBuilder {
  private pool: Pool;
  private tableName: string;
  private conditions: string[] = [];
  private params: unknown[] = [];
  private selectClause: string = '*';
  private orderByClause: string = '';
  private limitClause: string = '';
  private softDeleteField: string | null = 'deleted_at';

  constructor(tableName: string) {
    this.pool = getConnectionPool();
    this.tableName = tableName;
  }

  select(columns: string | string[]): this {
    this.selectClause = Array.isArray(columns) ? columns.join(', ') : columns;
    return this;
  }

  where(condition: string, ...values: unknown[]): this {
    this.conditions.push(condition);
    this.params.push(...values);
    return this;
  }

  whereIn(column: string, values: unknown[]): this {
    if (values.length === 0) return this;
    const placeholders = values.map(() => '?').join(', ');
    this.conditions.push(`${column} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  paginate({ page, limit, sortBy, sortOrder }: PaginationOptions): this {
    const offset = (Math.max(page, 1) - 1) * Math.max(limit, 1);
    this.limitClause = 'LIMIT ? OFFSET ?';
    this.params.push(Math.max(limit, 1), offset);

    if (sortBy) {
      const dir = sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Защита от SQL-инъекции через сортировку: разрешаем только буквенно-цифровые и символы подчёркивания
      const safeCol = sortBy.replace(/[^a-zA-Z0-9_.]/g, '');
      this.orderByClause = `ORDER BY ${safeCol} ${dir}`;
    }
    return this;
  }

  disableSoftDelete(): this {
    this.softDeleteField = null;
    return this;
  }

  private buildSelectQuery(suffix = ''): { sql: string; params: unknown[] } {
    let sql = `SELECT ${this.selectClause} FROM ${this.tableName}`;
    if (this.softDeleteField) this.conditions.push(`${this.softDeleteField} IS NULL`);
    if (this.conditions.length > 0) sql += ` WHERE ${this.conditions.join(' AND ')}`;
    if (this.orderByClause) sql += ` ${this.orderByClause}`;
    sql += ` ${this.limitClause}${suffix}`;
    return { sql, params: [...this.params] };
  }

  async execute<T = RowDataPacket>(): Promise<T[]> {
    const { sql, params } = this.buildSelectQuery();
    const [rows] = await this.pool.execute<T[]>(sql, params);
    return rows;
  }

  async count(): Promise<number> {
    // Строим отдельный COUNT запрос без ORDER BY и LIMIT
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    if (this.softDeleteField) this.conditions.push(`${this.softDeleteField} IS NULL`);
    if (this.conditions.length > 0) countSql += ` WHERE ${this.conditions.join(' AND ')}`;
    const [rows] = await this.pool.execute<{ total: number }>(countSql, this.params);
    return rows[0].total;
  }

  // Статические хелперы для INSERT/UPDATE/DELETE
  static async executeQuery(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    const pool = getConnectionPool();
    const [result] = await pool.execute<ResultSetHeader>(sql, params);
    return result;
  }
}