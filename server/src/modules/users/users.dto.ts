import { z } from 'zod';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['activist', 'subdept_lead', 'dept_lead', 'secretary', 'vice_chair', 'chair', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  search: z.string().max(50).trim().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export const updateUserSchema = z.object({
  login: z.string().min(3).max(50).trim().optional(),
  email: z.string().email().trim().optional(),
  role: z.enum(['activist', 'subdept_lead', 'dept_lead', 'secretary', 'vice_chair', 'chair', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type ListUsersInput = z.infer<typeof listUsersSchema>;

export interface UserPublicDTO {
  id: string;
  login: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}