import { z } from 'zod';

export const ATTACHMENT_TYPES = ['photo', 'video', 'text', 'file', 'other'] as const;
export const ATTACHMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;

export const createAttachmentSchema = z.object({
  task_id: z.string().uuid(),
  type: z.enum(ATTACHMENT_TYPES),
  mime_type: z.string().min(3).max(100),
  size_bytes: z.number().int().positive().max(52428800), // 50MB
  content_hash: z.string().length(64).regex(/^[a-f0-9]+$/).optional().nullable(),
});

export const reviewAttachmentSchema = z.object({
  status: z.enum(ATTACHMENT_STATUSES),
  review_comment: z.string().max(500).optional(),
});

export const listAttachmentsSchema = z.object({
  task_id: z.string().uuid().optional(),
  status: z.enum(ATTACHMENT_STATUSES).optional(),
  type: z.enum(ATTACHMENT_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type ReviewAttachmentInput = z.infer<typeof reviewAttachmentSchema>;
export type ListAttachmentsInput = z.infer<typeof listAttachmentsSchema>;
export type AttachmentStatus = typeof ATTACHMENT_STATUSES[number];
export type AttachmentType = typeof ATTACHMENT_TYPES[number];