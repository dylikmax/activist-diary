import { Request, Response, NextFunction } from 'express';
import { CommentService } from './comments.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';
import { getConnectionPool } from '../../database/connection'; // 👈 Добавить

export class CommentController {
  private service = new CommentService();
  private pool = getConnectionPool();

  // 🔍 Хелпер для получения ID отделов пользователя (избегает circular imports)
  private async getUserDeptIds(userId: string): Promise<string[]> {
    const [rows] = await this.pool.execute<{ department_id: string }[]>(
      `SELECT department_id FROM user_departments WHERE user_id = ?`,
      [userId]
    );
    return rows.map(r => r.department_id);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds = await this.getUserDeptIds(user.id); // 👈 Реальные ID отделов
      const result = await this.service.listComments(req.query as any, user.id, user.role, deptIds);
      
      const formatted = result.comments.map(c => ({ ...c, is_edited: Boolean(c.is_edited) }));
      res.status(200).json(responseWrapper.success(formatted, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        total: result.total
      }));
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const deptIds = await this.getUserDeptIds(user.id); // 👈 Реальные ID отделов
      const comment = await this.service.createComment(req.body, user.id, user.role, deptIds);
      const formatted = comment ? { ...comment, is_edited: Boolean(comment.is_edited) } : null;
      res.status(201).json(responseWrapper.success(formatted, 'Comment created'));
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const comment = await this.service.updateComment(req.params.id, req.body, user.id);
      const formatted = comment ? { ...comment, is_edited: Boolean(comment.is_edited) } : null;
      res.status(200).json(responseWrapper.success(formatted, 'Comment updated'));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await this.service.deleteComment(req.params.id, user.id, user.role);
      res.status(200).json(responseWrapper.success(null, 'Comment deleted'));
    } catch (err) { next(err); }
  };
}