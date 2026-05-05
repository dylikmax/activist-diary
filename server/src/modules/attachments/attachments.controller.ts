import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from './attachments.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';
import fs from 'fs';
import path from 'path';

export class AttachmentController {
  private service = new AttachmentService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list(req.query as any);
      res.status(200).json(responseWrapper.success(result.attachments, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        total: result.total
      }));
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = await this.service.upload(req.body, user.id, user.role);
      res.status(201).json(responseWrapper.success({ id }, 'Attachment metadata created'));
    } catch (err) { next(err); }
  };

  review = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await this.service.review(req.params.id, req.body, user.id, user.role);
      res.status(200).json(responseWrapper.success(null, 'Attachment reviewed'));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await this.service.delete(req.params.id, user.id, user.role);
      res.status(200).json(responseWrapper.success(null, 'Attachment deleted'));
    } catch (err) { next(err); }
  };

uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const file = req.file;
    const taskId = req.body.task_id;

    if (!file || !taskId) throw new HttpError(400, 'MISSING_DATA', 'File and task_id are required');

    // Целевая папка
    const targetDir = path.join(process.cwd(), 'uploads', 'tasks', taskId);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Имя файла генерирует multer, мы его просто используем
    const finalFilename = file.filename;
    const finalDiskPath = path.join(targetDir, finalFilename);

    // Перемещаем из tmp в целевую папку
    fs.renameSync(file.path, finalDiskPath);

    // Относительный путь для БД (строго совпадает с реальной структурой)
    const relativePath = `uploads/tasks/${taskId}/${finalFilename}`;

    const id = await this.service.upload({
      task_id: taskId,
      type: req.body.type || 'file',
      mime_type: file.mimetype,
      size_bytes: file.size,
      content_hash: null,
      storage_path: relativePath
    }, user.id, user.role);

    res.status(201).json(responseWrapper.success({ id, path: relativePath }, 'File uploaded successfully'));
  } catch (err) { next(err); }
};

  download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { filePath, fileName } = await this.service.getFileInfo(req.params.id, user.id, user.role);

      // ✅ res.download автоматически выставляет Content-Type, Content-Disposition и Content-Length
      res.download(filePath, fileName, (err) => {
        if (err && !res.headersSent) {
          next(new HttpError(500, 'DOWNLOAD_FAILED', 'File streaming error'));
        }
      });
    } catch (err) {
      next(err);
    }
  };
}