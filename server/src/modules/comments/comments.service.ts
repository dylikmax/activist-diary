import { CommentRepository } from './comments.repository';
import { TaskRepository } from '../tasks/tasks.repository';
import { HttpError } from '../../shared/utils/http-error';
import { v4 as uuidv4 } from 'uuid';
import type { CreateCommentInput, UpdateCommentInput, ListCommentsInput } from './comments.dto';
import logger from '../../config/logger';

export class CommentService {
  private repo = new CommentRepository();
  private taskRepo = new TaskRepository();

  private async validateTaskAccess(taskId: string, userId: string, userRole: string, userDeptIds: string[]) {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Cannot interact with non-existent task');

    const isGlobal = ['admin', 'chair', 'vice_chair'].includes(userRole);
    const isOwner = task.creator_id === userId;
    const isAssignee = task.assignee_id === userId;
    const isDeptLeader = userDeptIds.includes(task.department_id || '');

    if (!isGlobal && !isOwner && !isAssignee && !isDeptLeader) {
      throw new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Access denied to this task');
    }
    return task;
  }

  // ✅ ИСПРАВЛЕНО: добавлено `data:` перед типом
  async createComment(data: CreateCommentInput, userId: string, userRole: string, userDeptIds: string[]) {
    await this.validateTaskAccess(data.task_id, userId, userRole, userDeptIds);

    const id = uuidv4();
    await this.repo.create(id, { ...data, author_id: userId });
    logger.info(`[Comment] Created: ${id} on task ${data.task_id} by ${userId}`);
    return this.repo.findById(id);
  }

  async listComments(input: ListCommentsInput, userId: string, userRole: string, userDeptIds: string[]) {
    await this.validateTaskAccess(input.task_id, userId, userRole, userDeptIds);
    return this.repo.listByTask(input);
  }

  // ✅ ИСПРАВЛЕНО: добавлено `data:` перед типом
  async updateComment(id: string, data: UpdateCommentInput, userId: string) {
    const comment = await this.repo.findById(id);
    if (!comment) throw new HttpError(404, 'COMMENT_NOT_FOUND');
    if (comment.author_id !== userId) {
      throw new HttpError(403, 'FORBIDDEN', 'You can only edit your own comments');
    }
    if (data.content) {
      await this.repo.update(id, data.content);
      logger.info(`[Comment] Updated: ${id} by ${userId}`);
    }
    return this.repo.findById(id);
  }

  async deleteComment(id: string, userId: string, userRole: string) {
    const comment = await this.repo.findById(id);
    if (!comment) throw new HttpError(404, 'COMMENT_NOT_FOUND');

    const canDelete = comment.author_id === userId || ['admin', 'chair'].includes(userRole);
    if (!canDelete) {
      throw new HttpError(403, 'FORBIDDEN', 'You can only delete your own comments');
    }

    await this.repo.softDelete(id);
    logger.info(`[Comment] Deleted: ${id} by ${userId}`);
  }
}