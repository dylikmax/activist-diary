import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AttachmentRepository } from "./attachments.repository";
import { TaskRepository } from "../tasks/tasks.repository";
import { HttpError } from "../../shared/utils/http-error";
import { getConnectionPool } from "../../database/connection";
import type {
  CreateAttachmentInput,
  ReviewAttachmentInput,
} from "./attachments.dto";
import logger from "../../config/logger";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
];

export class AttachmentService {
  private repo = new AttachmentRepository();
  private taskRepo = new TaskRepository();
  private pool = getConnectionPool();

  // ✅ ИСПРАВЛЕНО: добавлено `data:` перед типом
  async upload(
    data: CreateAttachmentInput & { storage_path: string },
    uploaderId: string,
    uploaderRole: string,
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(data.mime_type)) {
      throw new HttpError(400, "INVALID_MIME_TYPE", "Unsupported file format");
    }

    const task = await this.taskRepo.findById(data.task_id);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND");

    const canUpload =
      task.assignee_id === uploaderId ||
      task.creator_id === uploaderId ||
      ["admin", "chair", "vice_chair"].includes(uploaderRole);

    if (!canUpload) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Cannot attach files to this task",
      );
    }

    const id = uuidv4();
    await this.repo.create(id, { ...data, uploader_id: uploaderId });

    logger.info(`[Attachment] Created: ${id} for task ${task.id}`);
    return id;
  }

  // ✅ ИСПРАВЛЕНО: добавлено `data:` перед типом
  async review(
    id: string,
    data: ReviewAttachmentInput,
    reviewerId: string,
    reviewerRole: string,
  ): Promise<void> {
    const attachment = await this.repo.findById(id);
    if (!attachment) throw new HttpError(404, "ATTACHMENT_NOT_FOUND");
    if (attachment.status !== "pending") {
      throw new HttpError(
        400,
        "ALREADY_REVIEWED",
        "Attachment already processed",
      );
    }

    const task = await this.taskRepo.findById(attachment.task_id);
    const canReview =
      ["admin", "chair", "secretary", "dept_lead"].includes(reviewerRole) ||
      task?.creator_id === reviewerId;

    if (!canReview) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Not authorized to review attachments",
      );
    }

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await this.repo.updateStatus(
        id,
        data.status,
        data.review_comment || null,
        reviewerId,
      );
      await conn.commit();
      logger.info(
        `[Attachment] Reviewed: ${id} -> ${data.status} by ${reviewerId}`,
      );
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const attachment = await this.repo.findById(id);
    if (!attachment) throw new HttpError(404, "ATTACHMENT_NOT_FOUND");

    const canDelete =
      attachment.uploader_id === userId ||
      ["admin", "chair"].includes(userRole);

    if (!canDelete) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Cannot delete this attachment",
      );
    }

    await this.repo.delete(id);
    logger.info(`[Attachment] Deleted: ${id} by ${userId}`);
  }

  // Внутри класса AttachmentService
async getFileInfo(id: string, userId: string, userRole: string) {
  const attachment = await this.repo.findById(id);
  if (!attachment) throw new HttpError(404, 'ATTACHMENT_NOT_FOUND');

  // Проверка прав доступа (как было ранее)
  const task = await this.taskRepo.findById(attachment.task_id);
  const hasAccess = task?.assignee_id === userId || task?.creator_id === userId || ['admin', 'chair', 'vice_chair', 'secretary', 'dept_lead'].includes(userRole);
  if (!hasAccess) throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Access denied');

  // Формируем полный путь: server/ + uploads/tasks/...
  const filePath = path.join(process.cwd(), attachment.storage_path);

  // Отладка (можно убрать потом)
  logger.info(`[Debug] Checking file at: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new HttpError(404, 'FILE_MISSING', `File not found at ${filePath}`);
  }

  return { filePath, mime: attachment.mime_type, fileName: path.basename(filePath) };
}

  async list(input: any) {
    return this.repo.list(input);
  }
}
