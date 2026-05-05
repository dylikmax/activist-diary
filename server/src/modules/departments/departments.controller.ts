import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from './departments.service';
import { responseWrapper } from '../../shared/dtos/response-wrapper.dto';

export class DepartmentController {
  private service = new DepartmentService();

  getTree = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await this.service.getTree();
      res.status(200).json(responseWrapper.success(tree));
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.createDepartment(req.body);
      res.status(201).json(responseWrapper.success(null));
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.updateDepartment(req.params.id, req.body);
      res.status(200).json(responseWrapper.success(null));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteDepartment(req.params.id);
      res.status(200).json(responseWrapper.success(null));
    } catch (err) { next(err); }
  };

  addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.addMember(req.params.id, req.body.userId, req.body.member_role);
      res.status(201).json(responseWrapper.success(null)); // ✅ Убрана строка
    } catch (err) { next(err); }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.removeMember(req.params.id, req.params.userId);
      res.status(200).json(responseWrapper.success(null));
    } catch (err) { next(err); }
  };

  setLeader = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.setLeader(req.params.id, req.body.userId);
      res.status(200).json(responseWrapper.success(null));
    } catch (err) { next(err); }
  };
}