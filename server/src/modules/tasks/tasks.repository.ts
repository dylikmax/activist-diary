import { getConnectionPool } from '../../database/connection';
import { QueryBuilder } from '../../database/query-builder';
import type { RowDataPacket } from 'mysql2/promise';
import { TaskStatus, TaskPriority, ListTasksInput, CreateTaskInput, UpdateTaskInput } from './tasks.dto';

export interface TaskRecord extends RowDataPacket {
  id: string;
  creator_id: string;
  assignee_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  attachment_req: any;
  is_recurring: number;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  assignee_login?: string;
  assignee_role?: string;
  department_name?: string;
}

const toMysqlDateTime = (isoStr: string | null | undefined): string | null => {
  if (!isoStr) return null;
  return new Date(isoStr).toISOString().slice(0, 19).replace('T', ' ');
};

export class TaskRepository {
  private pool = getConnectionPool();

    async getAccessibleDeptIds(userId: string): Promise<string[]> {
    const query = `
      SELECT d.id FROM departments d
      WHERE d.leader_id = ? AND d.deleted_at IS NULL
      UNION
      SELECT ud.department_id FROM user_departments ud
      WHERE ud.user_id = ?
    `;
    const [rows] = await this.pool.execute<{ id: string }[]>(query, [userId, userId]);
    return rows.map(r => r.id);
  }

  async findById(id: string): Promise<TaskRecord | null> {
    const [rows] = await this.pool.execute<TaskRecord[]>(
      `SELECT t.*, u.login as assignee_login, u.role as assignee_role, d.name as department_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ? AND t.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

    async findWithPagination(
    input: ListTasksInput,
    userId: string,
    userRole: string
  ): Promise<{ tasks: TaskRecord[]; total: number }> {
    const page = Math.max(1, Math.floor(Number(input.page)) || 1);
    const limit = Math.min(Math.max(1, Math.floor(Number(input.limit)) || 20), 100);
    const offset = (page - 1) * limit;
    const safeSort = String(input.sortBy || 'created_at').replace(/[^a-zA-Z0-9_.]/g, '');
    const safeDir = input.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ['t.deleted_at IS NULL'];
    const params: (string | number)[] = [];

    const isGlobal = ['admin', 'chair', 'vice_chair', 'secretary'].includes(userRole);

    if (!isGlobal) {
      const accessibleDeptIds = await this.getAccessibleDeptIds(userId);
      const visibilityParts: string[] = [];

      visibilityParts.push('t.assignee_id = ?');
      params.push(String(userId));

      visibilityParts.push('t.creator_id = ?');
      params.push(String(userId));

      if (accessibleDeptIds.length > 0) {
        const placeholders = accessibleDeptIds.map(() => '?').join(', ');
        visibilityParts.push(`t.department_id IN (${placeholders})`);
        params.push(...accessibleDeptIds.map(String));
      }

      conditions.push(`(${visibilityParts.join(' OR ')})`);
    }

    const addFilter = (col: string, val: unknown) => {
      if (val !== undefined && val !== null && val !== '') {
        conditions.push(`${col} = ?`);
        params.push(String(val));
      }
    };
    addFilter('t.status', input.status);
    addFilter('t.priority', input.priority);
    addFilter('t.assignee_id', input.assignee_id);
    addFilter('t.department_id', input.department_id);

    const whereClause = conditions.join(' AND ');
    const joins = `LEFT JOIN users u ON t.assignee_id = u.id LEFT JOIN departments d ON t.department_id = d.id`;

    const countSql = `SELECT COUNT(*) as total FROM tasks t ${joins} WHERE ${whereClause}`;
    const dataSql = `SELECT t.*, u.login as assignee_login, u.role as assignee_role, d.name as department_name 
                     FROM tasks t ${joins} WHERE ${whereClause} ORDER BY t.${safeSort} ${safeDir} LIMIT ${limit} OFFSET ${offset}`;

    const [countRows] = await this.pool.query<{ total: number }[]>(countSql, params);
    const total = countRows[0]?.total || 0;

    const [dataRows] = await this.pool.query<TaskRecord[]>(dataSql, params);
    return { tasks: dataRows, total };
  }

  async create(data: CreateTaskInput & { creator_id: string }): Promise<void> {
    await QueryBuilder.executeQuery(
      `INSERT INTO tasks (id, creator_id, assignee_id, department_id, title, description, status, priority, deadline, attachment_req, is_recurring, recurrence_rule)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)`,
      [
        data.creator_id,
        data.assignee_id,
        data.department_id || null,
        data.title,
        data.description || null,
        data.priority,
        toMysqlDateTime(data.deadline),
        data.attachment_req ? JSON.stringify(data.attachment_req) : null,
        data.is_recurring ? 1 : 0,
        data.recurrence_rule || null
      ]
    );
  }

  async update(id: string, data: UpdateTaskInput): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); values.push(toMysqlDateTime(data.deadline)); }
    if (data.attachment_req !== undefined) { fields.push('attachment_req = ?'); values.push(JSON.stringify(data.attachment_req)); }

    if (fields.length === 0) return;
    values.push(id);
    await QueryBuilder.executeQuery(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async changeStatus(id: string, status: TaskStatus): Promise<void> {
    const now = status === 'completed' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await QueryBuilder.executeQuery(
      `UPDATE tasks SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ?`,
      [status, now, id]
    );
  }

  async softDelete(id: string): Promise<void> {
    await QueryBuilder.executeQuery(`UPDATE tasks SET deleted_at = NOW() WHERE id = ?`, [id]);
  }

async getAttachmentCount(taskId: string): Promise<number> {
  const [rows] = await this.pool.execute<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM task_attachments WHERE task_id = ?`,
    [taskId]
  );
  return rows[0]?.cnt || 0;
}
}