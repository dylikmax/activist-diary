import { z } from 'zod';

export const TASK_STATUSES = ['new', 'in_progress', 'under_review', 'completed', 'rejected', 'archived'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(150).trim(),
  assignee_id: z.string().uuid(),
  department_id: z.string().uuid().optional().nullable(),
  description: z.string().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  deadline: z.string().datetime({ message: 'Invalid datetime format (YYYY-MM-DDTHH:mm:ssZ)' }).optional().nullable(),
  attachment_req: z.array(z.enum(['photo', 'video', 'text', 'file'])).optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().max(100).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(150).trim().optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  deadline: z.string().datetime().optional().nullable(),
  attachment_req: z.array(z.enum(['photo', 'video', 'text', 'file'])).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const listTasksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignee_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListTasksInput = z.infer<typeof listTasksSchema>;
export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];