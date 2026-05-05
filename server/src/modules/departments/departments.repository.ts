import { QueryBuilder } from '../../database/query-builder';
import { getConnectionPool } from '../../database/connection';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DepartmentTreeNode } from './department.dto';

export interface DepartmentRecord extends RowDataPacket {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  leader_id: string | null;
  default_attachment_req: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DepartmentRepository {
  private pool = getConnectionPool();

  async findById(id: string): Promise<DepartmentRecord | null> {
    const rows = await new QueryBuilder('departments').select('*').where('id = ?', id).execute<DepartmentRecord[]>();
    return rows[0] || null;
  }

  async findAllActive(): Promise<DepartmentRecord[]> {
    const [rows] = await this.pool.execute<DepartmentRecord[]>(
      `SELECT * FROM departments WHERE deleted_at IS NULL ORDER BY name ASC`
    );
    return rows;
  }

  async create(data: { name: string; parent_id?: string | null; description?: string; default_attachment_req?: string[] }): Promise<void> {
    await QueryBuilder.executeQuery(
      `INSERT INTO departments (id, parent_id, name, description, default_attachment_req) VALUES (UUID(), ?, ?, ?, ?)`,
      [data.parent_id || null, data.name, data.description || null, JSON.stringify(data.default_attachment_req || [])]
    );
  }

  async update(id: string, data: Partial<Pick<typeof data, 'name' | 'description' | 'default_attachment_req'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.default_attachment_req !== undefined) { fields.push('default_attachment_req = ?'); values.push(JSON.stringify(data.default_attachment_req)); }
    
    if (fields.length === 0) return;
    values.push(id);
    await QueryBuilder.executeQuery(`UPDATE departments SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async softDelete(id: string): Promise<void> {
    await QueryBuilder.executeQuery(`UPDATE departments SET deleted_at = NOW() WHERE id = ?`, [id]);
  }

  async findChildrenCount(parentId: string): Promise<number> {
    const [rows] = await this.pool.execute<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM departments WHERE parent_id = ? AND deleted_at IS NULL`,
      [parentId]
    );
    return rows[0].cnt;
  }

  async addMember(userId: string, deptId: string, role: string): Promise<void> {
    await QueryBuilder.executeQuery(
      `INSERT IGNORE INTO user_departments (user_id, department_id, member_role, joined_at) VALUES (?, ?, ?, NOW())`,
      [userId, deptId, role]
    );
  }

  async removeMember(userId: string, deptId: string): Promise<void> {
    await QueryBuilder.executeQuery(
      `DELETE FROM user_departments WHERE user_id = ? AND department_id = ?`,
      [userId, deptId]
    );
  }

  async isMember(userId: string, deptId: string): Promise<boolean> {
    const [rows] = await this.pool.execute<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM user_departments WHERE user_id = ? AND department_id = ?`,
      [userId, deptId]
    );
    return rows[0].cnt > 0;
  }

  async setLeader(deptId: string, userId: string): Promise<void> {
    await QueryBuilder.executeQuery(
      `UPDATE departments SET leader_id = ? WHERE id = ?`,
      [userId, deptId]
    );
  }
}