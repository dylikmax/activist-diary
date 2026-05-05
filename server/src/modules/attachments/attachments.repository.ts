import { getConnectionPool } from '../../database/connection';
import type { RowDataPacket } from 'mysql2/promise';
import { ListAttachmentsInput } from './attachments.dto';

export interface AttachmentRecord extends RowDataPacket {
  id: string;
  task_id: string;
  uploader_id: string;
  type: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  content_hash: string | null;
  status: string;
  reviewer_id: string | null;
  review_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export class AttachmentRepository {
  private pool = getConnectionPool();

  // ✅ Исправлена сигнатура (добавлено data:)
  async create(id: string, data: { task_id: string; uploader_id: string; type: string; storage_path: string; mime_type: string; size_bytes: number; content_hash: string | null }): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO task_attachments (id, task_id, uploader_id, type, storage_path, mime_type, size_bytes, content_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [id, data.task_id, data.uploader_id, data.type, data.storage_path, data.mime_type, data.size_bytes, data.content_hash || null]
      );
    } finally {
      conn.release();
    }
  }

  async findById(id: string): Promise<AttachmentRecord | null> {
    const [rows] = await this.pool.execute<AttachmentRecord[]>(
      `SELECT * FROM task_attachments WHERE id = ?`, [id]
    );
    return (rows as any)[0] || null;
  }

  async list(input: ListAttachmentsInput): Promise<{ attachments: AttachmentRecord[]; total: number }> {
    // 1. Жёсткая валидация пагинации
    const page = Math.max(1, parseInt(String(input.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(input.limit), 10) || 20));
    const offset = (page - 1) * limit;

    // 2. Динамический WHERE с точным соответствием ? и params
    const conditions: string[] = [];
    const params: any[] = [];

    if (input.task_id && typeof input.task_id === 'string') {
      conditions.push('task_id = ?');
      params.push(input.task_id);
    }
    if (input.status && typeof input.status === 'string') {
      conditions.push('status = ?');
      params.push(input.status);
    }
    if (input.type && typeof input.type === 'string') {
      conditions.push('type = ?');
      params.push(input.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. COUNT запрос (только параметры WHERE)
    const countSql = `SELECT COUNT(*) as total FROM task_attachments ${whereClause}`;
    const [countRows] = await this.pool.execute(countSql, params);
    const total = Number((countRows as any)[0]?.total) || 0;

    // 4. DATA запрос: LIMIT/OFFSET подставляются как безопасные числа
    const dataSql = `SELECT * FROM task_attachments ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const [dataRows] = await this.pool.execute(dataSql, params);

    return { attachments: dataRows as AttachmentRecord[], total };
  }

  async updateStatus(id: string, status: string, comment: string | null, reviewerId: string): Promise<void> {
    await this.pool.execute(
      `UPDATE task_attachments SET status = ?, review_comment = ?, reviewer_id = ?, reviewed_at = NOW() WHERE id = ?`,
      [status, comment, reviewerId, id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.execute(`DELETE FROM task_attachments WHERE id = ?`, [id]);
  }
}