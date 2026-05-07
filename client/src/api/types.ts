// === Глобальный формат ответа ===
export interface ApiErrorDetail {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  pagination: Pagination | null;
  errors: ApiError | null;
}

// === Пользователь ===
export type Role = 'activist' | 'dept_lead' | 'secretary' | 'vice_chair' | 'chair' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'banned';

export interface User {
  id: string;
  login: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string; // ISO 8601
}

// === Отделы ===
export interface DepartmentTree {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  parent_id: string | null;
  children: DepartmentTree[];
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  parent_id: string | null;
  default_attachment_req: string[] | null;
  created_at: string;
  updated_at: string;
}

// === Задачи ===
export type TaskStatus = 'new' | 'in_progress' | 'under_review' | 'completed' | 'rejected' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AttachmentType = 'photo' | 'video' | 'text' | 'file' | 'other';

export interface Task {
  id: string;
  creator_id: string;
  assignee_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null; // ISO 8601
  attachment_req: AttachmentType[] | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Denormalized fields for display
  assignee_login?: string | null;
  department_name?: string | null;
}

export interface TaskCreate {
  title: string;
  assignee_id: string;
  department_id?: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string;
  attachment_req?: AttachmentType[];
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  attachment_req?: AttachmentType[];
}

export interface TaskStatusUpdate {
  status: TaskStatus;
}

// === Вложения ===
export interface Attachment {
  id: string;
  task_id: string;
  type: AttachmentType;
  mime_type: string;
  size_bytes: number;
  status: 'pending' | 'approved' | 'rejected';
  review_comment: string | null;
  created_at: string;
}

export interface AttachmentCreate {
  task_id: string;
  type: AttachmentType;
  mime_type: string;
  size_bytes: number;
  content_hash?: string;
}

export interface AttachmentReview {
  status: 'approved' | 'rejected';
  review_comment?: string;
}

// === Комментарии ===
export interface Comment {
  id: string;
  content: string;
  is_edited: boolean;
  author_login: string;
  author_role: Role;
  created_at: string;
}

export interface CommentCreate {
  task_id: string;
  content: string;
}

export interface CommentUpdate {
  content: string;
}

// === Вспомогательные типы для форм ===
export interface LoginCredentials {
  login: string;
  password: string;
}

export interface RegisterCredentials {
  login: string;
  email: string;
  password: string;
}

export interface DepartmentMember {
  userId: string;
  member_role: 'member' | 'lead';
}