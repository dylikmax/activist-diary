import { getConnectionPool } from '../../database/connection';
import type { RowDataPacket } from 'mysql2/promise';
import { CreateCommentInput, ListCommentsInput } from './comments.dto';

export interface CommentRecord extends RowDataPacket {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  is_edited: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_login?: string;
  author_role?: string;
}

export class CommentRepository {
  private pool = getConnectionPool();

  async create(id: string, inputData: CreateCommentInput & { author_id: string }): Promise<void> {
    await this.pool.execute(
      `INSERT INTO task_comments (id, task_id, author_id, content) VALUES (?, ?, ?, ?)`,
      [id, inputData.task_id, inputData.author_id, inputData.content]
    );
  }

  async findById(id: string): Promise<CommentRecord | null> {
    const [rows] = await this.pool.execute(
      `SELECT c.*, u.login as author_login, u.role as author_role
       FROM task_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.id = ? AND c.deleted_at IS NULL`,
      [id]
    );
    return (rows as CommentRecord[])[0] || null;
  }

  // ✅ ИСПРАВЛЕНО: замена execute() на query() для пагинации (обход бага mysql2 с LIMIT/OFFSET)
  async listByTask(input: ListCommentsInput): Promise<{ comments: CommentRecord[]; total: number }> {
    const page = Math.max(1, Math.floor(Number(input.page) || 1));
    const limit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
    const offset = (page - 1) * limit;
    const taskId = String(input.task_id).trim();

    if (!taskId) throw new Error('task_id is required for comment listing');

    const baseWhere = 'c.task_id = ? AND c.deleted_at IS NULL';

    // COUNT запрос (execute безопасен для 1 параметра)
    const [countRows] = await this.pool.execute<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM task_comments c WHERE ${baseWhere}`,
      [taskId]
    );
    const total = Number(countRows[0]?.total ?? 0);

    // DATA запрос (query использует текстовый протокол, минуя mysqld_stmt_execute)
    const [dataRows] = await this.pool.query<CommentRecord[]>(
      `SELECT c.*, u.login as author_login, u.role as author_role
       FROM task_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE ${baseWhere}
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [taskId, limit, offset]
    );

    return { comments: dataRows, total };
  }

  async update(id: string, content: string): Promise<void> {
    await this.pool.execute(
      `UPDATE task_comments SET content = ?, is_edited = 1, updated_at = NOW() WHERE id = ?`,
      [content, id]
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.pool.execute(
      `UPDATE task_comments SET deleted_at = NOW() WHERE id = ?`,
      [id]
    );
  }
}