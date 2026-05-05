import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional(),
  default_attachment_req: z.array(z.enum(['photo', 'video', 'text', 'file'])).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  default_attachment_req: z.array(z.enum(['photo', 'video', 'text', 'file'])).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  member_role: z.enum(['member', 'lead']).default('member'),
});

export const setLeaderSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SetLeaderInput = z.infer<typeof setLeaderSchema>;

export interface DepartmentTreeNode {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  default_attachment_req: any;
  parent_id: string | null;
  children: DepartmentTreeNode[];
}