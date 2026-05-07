import { Request, Response, NextFunction } from 'express';
import { UserService } from './users.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';

export class UserController {
  private service = new UserService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req as any).validatedQuery || {};
      const result = await this.service.listUsers(q);

      res.status(200).json(responseWrapper.success(result.users, {
        page: Number(q.page),
        limit: Number(q.limit),
        total: result.total
      }));
    } catch (err) {
      next(err);
    }
  };

    update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.id;
      const updated = await this.service.updateUser(req.params.id, req.body, actorId);
      res.status(200).json(responseWrapper.success(updated, 'User updated successfully'));
    } catch (err) {
      next(err);
    }
  };
}