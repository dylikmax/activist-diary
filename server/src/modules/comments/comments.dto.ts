import { z } from 'zod';

export const createCommentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(2000).trim(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim().optional(),
});

export const listCommentsSchema = z.object({
  task_id: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsInput = z.infer<typeof listCommentsSchema>;