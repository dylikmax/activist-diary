import { Router } from 'express';
import { AttachmentController } from './attachments.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Безопасный маппинг MIME → расширение
const MIME_TO_EXT: Record<string, string> = {
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'text/plain': 'txt', 'text/csv': 'csv', 'text/markdown': 'md',
};

const getSafeExt = (mime: string) => MIME_TO_EXT[mime] || mime.split('/')[1]?.split('+')[0] || 'bin';

const uploadsDir = path.join(process.cwd(), 'uploads');
const tmpDir = path.join(uploadsDir, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename: (_req, file, cb) => {
    const ext = getSafeExt(file.mimetype);
    // Гарантируем уникальное имя с правильным расширением
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();
const ctrl = new AttachmentController();

router.post('/upload', authenticate, upload.single('file'), ctrl.uploadFile);
router.get('/', authenticate, ctrl.list);
router.get('/:id/download', authenticate, ctrl.download);
router.patch('/:id/review', authenticate, ctrl.review);
router.delete('/:id', authenticate, ctrl.delete);

export default router;