import { Request, Response, NextFunction } from 'express';
import { TaskService } from './tasks.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';
import { HttpError } from '../../shared/utils/http-error';

export class TaskController {
  private service = new TaskService();

    list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ Берем уже валидированные и типизированные данные
      const q = (req as any).validatedQuery || {};
      const { page, limit, status, priority, assignee_id, department_id, sortBy, sortOrder } = q;

      const user = req.user!;
      // TODO: Замените на реальный запрос к таблице user_departments
      const deptIds: string[] = []; 

      const result = await this.service.listTasks(
        { page, limit, status, priority, assignee_id, department_id, sortBy, sortOrder },
        user.id,
        user.role,
        deptIds
      );

      res.status(200).json(responseWrapper.success(result.tasks, {
        page: Number(page),
        limit: Number(limit),
        total: result.total
      }));
    } catch (err) {
      next(err);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds: string[] = []; // Заглушка
      const task = await this.service.getTask(req.params.id, user.id, user.role, deptIds);
      res.status(200).json(responseWrapper.success(task));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds: string[] = []; // Заглушка
      await this.service.createTask(req.body, user.id, user.role, deptIds);
      res.status(201).json(responseWrapper.success(null, 'Task created'));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds: string[] = []; // Заглушка
      await this.service.updateTask(req.params.id, req.body, user.id, user.role, deptIds);
      res.status(200).json(responseWrapper.success(null, 'Task updated'));
    } catch (err) {
      next(err);
    }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds: string[] = []; // Заглушка
      await this.service.changeStatus(req.params.id, req.body, user.id, user.role, deptIds);
      res.status(200).json(responseWrapper.success(null, 'Status updated'));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds: string[] = []; // Заглушка
      await this.service.deleteTask(req.params.id, user.id, user.role, deptIds);
      res.status(200).json(responseWrapper.success(null, 'Task deleted'));
    } catch (err) {
      next(err);
    }
  };
}