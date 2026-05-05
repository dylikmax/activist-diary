import { QueryBuilder } from '../../database/query-builder';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { UserSafePayload } from './auth.dto';

export interface UserRecord extends UserSafePayload {
  password_hash: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AuthRepository {
  async createUser(data: { login: string; email: string; passwordHash: string; role: string }): Promise<void> {
    await QueryBuilder.executeQuery(
      `INSERT INTO users (login, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [data.login, data.email, data.passwordHash, data.role]
    );
  }

  async findByLoginOrEmail(identifier: string): Promise<UserRecord | null> {
    const rows = await new QueryBuilder('users')
      .select('*')
      .where('(login = ? OR email = ?) AND deleted_at IS NULL', identifier, identifier)
      .execute<UserRecord[]>();
    
    return rows[0] || null;
  }

  async updatePasswordHash(id: string, hash: string): Promise<void> {
    await QueryBuilder.executeQuery(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [hash, id]
    );
  }
}