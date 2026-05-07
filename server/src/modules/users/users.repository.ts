import { getConnectionPool } from '../../database/connection';
import { UserPublicDTO, ListUsersInput, UpdateUserInput } from './users.dto';
import type { RowDataPacket } from 'mysql2/promise';

export class UserRepository {
  private pool = getConnectionPool();

  async findWithPagination(input: ListUsersInput): Promise<{ users: UserPublicDTO[]; total: number }> {
    const page = Math.max(1, Math.floor(Number(input.page)) || 1);
    const limit = Math.min(Math.max(1, Math.floor(Number(input.limit)) || 20), 100);
    const offset = (page - 1) * limit;
    const safeSort = String(input.sortBy || 'created_at').replace(/[^a-zA-Z0-9_.]/g, '');
    const safeDir = input.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: (string | number)[] = [];

    if (input.role) { conditions.push('role = ?'); params.push(input.role); }
    if (input.status) { conditions.push('status = ?'); params.push(input.status); }
    if (input.search) {
      conditions.push('(login LIKE ? OR email LIKE ?)');
      const likeVal = `%${input.search}%`;
      params.push(likeVal, likeVal);
    }

    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
    const dataSql = `SELECT id, login, email, role, status, created_at FROM users WHERE ${whereClause} ORDER BY ${safeSort} ${safeDir} LIMIT ${limit} OFFSET ${offset}`;

    const [countRows] = await this.pool.query<{ total: number }[]>(countSql, params);
    const total = countRows[0]?.total || 0;

    const [dataRows] = await this.pool.query<UserPublicDTO[]>(dataSql, params);
    return { users: dataRows, total };
  }

    async findById(id: string): Promise<UserPublicDTO | null> {
    const [rows] = await this.pool.query<UserPublicDTO[]>(
      `SELECT id, login, email, role, status, created_at FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  async findConflictingCredentials(login?: string, email?: string, excludeUserId?: string): Promise<boolean> {
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (login) { conditions.push('login = ?'); params.push(login); }
    if (email) { conditions.push('email = ?'); params.push(email); }
    if (conditions.length === 0) return false;

    let sql = `SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL AND (${conditions.join(' OR ')})`;
    if (excludeUserId) {
      sql += ` AND id != ?`;
      params.push(excludeUserId);
    }

    const [rows] = await this.pool.query<{ cnt: number }[]>(sql, params);
    return rows[0].cnt > 0;
  }

  async update(id: string, data: UpdateUserInput): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.login !== undefined) { fields.push('login = ?'); values.push(data.login); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await this.pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}