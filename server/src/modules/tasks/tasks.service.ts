import { TaskRepository } from './tasks.repository';
import { HttpError } from '../../shared/utils/http-error';
import { getConnectionPool } from '../../database/connection';
import type { CreateTaskInput, UpdateTaskInput, ChangeStatusInput, TaskStatus, TaskRecord } from './tasks.dto';
import logger from '../../config/logger';

// State Machine: разрешённые переходы
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  new: ['in_progress'],
  in_progress: ['under_review', 'rejected'],
  under_review: ['completed', 'rejected'],
  completed: ['archived'],
  rejected: ['in_progress'],
  archived: [],
};

export class TaskService {
  private repo = new TaskRepository();
  private pool = getConnectionPool();

  private async validateUserAccess(userId: string, task: TaskRecord, role: string, deptIds: string[]) {
    const isGlobal = ['admin', 'chair', 'vice_chair'].includes(role);
    const isOwner = task.creator_id === userId;
    const isAssignee = task.assignee_id === userId;
    const isDeptLeader = deptIds.includes(task.department_id || '');

    if (!isGlobal && !isOwner && !isAssignee && !isDeptLeader) {
      throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Access denied to this task');
    }
  }

  async listTasks(input: any, userId: string, role: string, deptIds: string[]) {
    return this.repo.findWithPagination(input, userId, role, deptIds);
  }

  async getTask(id: string, userId: string, role: string, deptIds: string[]) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND');
    await this.validateUserAccess(userId, task, role, deptIds);
    return task;
  }

  // ✅ ИСПРАВЛЕНО
  async createTask(data: CreateTaskInput, creatorId: string, creatorRole: string, creatorDeptIds: string[]) {
    if (data.deadline && new Date(data.deadline) <= new Date()) {
      throw new HttpError(400, 'INVALID_DEADLINE', 'Deadline must be in the future');
    }

    const isGlobal = ['admin', 'chair', 'vice_chair'].includes(creatorRole);
    const isSelf = data.assignee_id === creatorId;
    const canAssignDept = data.department_id ? creatorDeptIds.includes(data.department_id) : false;
    
    if (!isGlobal && !isSelf && !canAssignDept) {
      throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Cannot assign task to this user/department');
    }

    await this.repo.create({ ...data, creator_id: creatorId });
    logger.info(`[Task] Created: ${data.title} by ${creatorId}`);
  }

  // ✅ ИСПРАВЛЕНО
  async updateTask(id: string, data: UpdateTaskInput, userId: string, role: string, deptIds: string[]) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND');
    
    if (task.creator_id !== userId && !deptIds.includes(task.department_id || '') && !['admin', 'chair'].includes(role)) {
      throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Cannot update this task');
    }

    await this.repo.update(id, data);
  }

  // ✅ ИСПРАВЛЕНО
  async changeStatus(id: string, input: ChangeStatusInput, userId: string, role: string, deptIds: string[]) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND');

    await this.validateUserAccess(userId, task, role, deptIds);

    const allowed = ALLOWED_TRANSITIONS[task.status];
    if (!allowed.includes(input.status)) {
      throw new HttpError(400, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${task.status} to ${input.status}`);
    }

    if ((input.status === 'under_review' || input.status === 'completed') && task.attachment_req) {
      const count = await this.repo.getAttachmentCount(id);
      if (count === 0) {
        throw new HttpError(400, 'MISSING_ATTACHMENTS', 'Task requires attachments before marking as completed/review');
      }
    }

    await this.repo.changeStatus(id, input.status);
    logger.info(`[Task] Status changed: ${id} -> ${input.status} by ${userId}`);
  }

  async deleteTask(id: string, userId: string, role: string, deptIds: string[]) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND');
    
    if (task.creator_id !== userId && !['admin', 'chair'].includes(role)) {
      throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Only creator or admin can delete tasks');
    }

    await this.repo.softDelete(id);
    logger.info(`[Task] Deleted: ${id} by ${userId}`);
  }
}