import { TaskRepository } from "./tasks.repository";
import { HttpError } from "../../shared/utils/http-error";
import { getConnectionPool } from "../../database/connection";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ChangeStatusInput,
  TaskStatus,
  TaskRecord,
} from "./tasks.dto";
import logger from "../../config/logger";

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  new: ["in_progress"],
  in_progress: ["under_review", "rejected"],
  under_review: ["completed", "rejected"],
  completed: ["archived"],
  rejected: ["in_progress"],
  archived: [],
};

export class TaskService {
  private repo = new TaskRepository();
  private pool = getConnectionPool();

  // ✅ ИСПРАВЛЕНО: deptIds больше не требуется извне, запрашиваем динамически
  private async validateUserAccess(
    userId: string,
    task: TaskRecord,
    role: string,
  ) {
    const isGlobal = ["admin", "chair", "vice_chair", "secretary"].includes(
      role,
    );
    if (isGlobal) return;

    const isOwner = task.creator_id === userId;
    const isAssignee = task.assignee_id === userId;
    if (isOwner || isAssignee) return;

    // Если задача привязана к отделу, проверяем доступ пользователя к нему
    if (task.department_id) {
      const accessibleDepts = await this.repo.getAccessibleDeptIds(userId);
      if (accessibleDepts.includes(task.department_id)) return;
    }

    throw new HttpError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "Access denied to this task",
    );
  }

  async listTasks(input: any, userId: string, role: string) {
    return this.repo.findWithPagination(input, userId, role);
  }

  async getTask(id: string, userId: string, role: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND");
    await this.validateUserAccess(userId, task, role);
    return task;
  }

  async createTask(
    data: CreateTaskInput,
    creatorId: string,
    creatorRole: string,
  ) {
    if (data.deadline && new Date(data.deadline) <= new Date()) {
      throw new HttpError(
        400,
        "INVALID_DEADLINE",
        "Deadline must be in the future",
      );
    }

    const isGlobal = ["admin", "chair", "vice_chair"].includes(creatorRole);
    const isSelf = data.assignee_id === creatorId;

    let canAssignDept = false;
    if (data.department_id) {
      const deptIds = await this.repo.getAccessibleDeptIds(creatorId);
      canAssignDept = deptIds.includes(data.department_id);
    }

    if (!isGlobal && !isSelf && !canAssignDept) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Cannot assign task to this user/department",
      );
    }

    await this.repo.create({ ...data, creator_id: creatorId });
    logger.info(`[Task] Created: ${data.title} by ${creatorId}`);
  }

  async updateTask(
    id: string,
    data: UpdateTaskInput,
    userId: string,
    role: string,
  ) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND");

    const isGlobal = ["admin", "chair"].includes(role);
    const isCreator = task.creator_id === userId;

    let isDeptLeader = false;
    if (task.department_id) {
      const deptIds = await this.repo.getAccessibleDeptIds(userId);
      isDeptLeader = deptIds.includes(task.department_id);
    }

    if (!isGlobal && !isCreator && !isDeptLeader) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Cannot update this task",
      );
    }

    await this.repo.update(id, data);
  }

  async changeStatus(
    id: string,
    input: ChangeStatusInput,
    userId: string,
    role: string,
  ) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND");

    await this.validateUserAccess(userId, task, role);

    const allowed = ALLOWED_TRANSITIONS[task.status];
    if (!allowed.includes(input.status)) {
      throw new HttpError(
        400,
        "INVALID_STATUS_TRANSITION",
        `Cannot transition from ${task.status} to ${input.status}`,
      );
    }

    if (
      (input.status === "under_review" || input.status === "completed") &&
      task.attachment_req
    ) {
      const count = await this.repo.getAttachmentCount(id);
      if (count === 0) {
        throw new HttpError(
          400,
          "MISSING_ATTACHMENTS",
          "Task requires attachments before marking as completed/review",
        );
      }
    }

    await this.repo.changeStatus(id, input.status);
    logger.info(`[Task] Status changed: ${id} -> ${input.status} by ${userId}`);
  }

  async deleteTask(id: string, userId: string, role: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND");

    const isCreator = task.creator_id === userId;
    const isGlobal = ["admin", "chair"].includes(role);

    if (!isCreator && !isGlobal) {
      throw new HttpError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Only creator or admin can delete tasks",
      );
    }

    await this.repo.softDelete(id);
    logger.info(`[Task] Deleted: ${id} by ${userId}`);
  }
}
