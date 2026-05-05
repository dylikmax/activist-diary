import { DepartmentRepository } from './departments.repository';
import { HttpError } from '../../shared/utils/http-error';
import { getConnectionPool } from '../../database/connection';
import type { CreateDepartmentInput, UpdateDepartmentInput, DepartmentTreeNode, DepartmentRecord } from './department.dto';
import logger from '../../config/logger';

export class DepartmentService {
  private repo = new DepartmentRepository();
  private pool = getConnectionPool();

  async getTree(): Promise<DepartmentTreeNode[]> {
    const flat = await this.repo.findAllActive();
    const map = new Map<string, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    // 1. Создаём мапу узлов
    flat.forEach(d => {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        description: d.description,
        leader_id: d.leader_id,
        default_attachment_req: d.default_attachment_req,
        parent_id: d.parent_id,
        children: [],
      });
    });

    // 2. Строим дерево
    flat.forEach(d => {
      const node = map.get(d.id)!;
      if (d.parent_id && map.has(d.parent_id)) {
        map.get(d.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async createDepartment(data: CreateDepartmentInput): Promise<void> {
    if (data.parent_id) {
      const parent = await this.repo.findById(data.parent_id);
      if (!parent) throw new HttpError(404, 'PARENT_NOT_FOUND', 'Родительский отдел не найден');
      if (parent.deleted_at) throw new HttpError(400, 'DELETED_PARENT', 'Нельзя привязать к удалённому отделу');
    }

    await this.repo.create(data);
    logger.info(`[Department] Created: ${data.name} (parent: ${data.parent_id || 'root'})`);
  }

  async updateDepartment(id: string, data: UpdateDepartmentInput): Promise<void> {
    const dept = await this.repo.findById(id);
    if (!dept || dept.deleted_at) throw new HttpError(404, 'DEPARTMENT_NOT_FOUND');
    await this.repo.update(id, data);
    logger.info(`[Department] Updated: ${id}`);
  }

  async deleteDepartment(id: string): Promise<void> {
    const dept = await this.repo.findById(id);
    if (!dept || dept.deleted_at) throw new HttpError(404, 'DEPARTMENT_NOT_FOUND');

    const childrenCount = await this.repo.findChildrenCount(id);
    if (childrenCount > 0) throw new HttpError(400, 'HAS_CHILDREN', 'Нельзя удалить отдел с активными подотделами');

    await this.repo.softDelete(id);
    logger.info(`[Department] Deleted: ${id}`);
  }

  async addMember(deptId: string, userId: string, role: string): Promise<void> {
    const dept = await this.repo.findById(deptId);
    if (!dept) throw new HttpError(404, 'DEPARTMENT_NOT_FOUND');
    await this.repo.addMember(userId, deptId, role);
  }

  async removeMember(deptId: string, userId: string): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Если удаляемый пользователь был руководителем, снимаем с должности
      const [rows] = await conn.execute(`SELECT leader_id FROM departments WHERE id = ?`, [deptId]);
      if (rows[0]?.leader_id === userId) {
        await conn.execute(`UPDATE departments SET leader_id = NULL WHERE id = ?`, [deptId]);
      }
      
      await this.repo.removeMember(userId, deptId);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async setLeader(deptId: string, newLeaderUserId: string): Promise<void> {
  const dept = await this.repo.findById(deptId);
  if (!dept || dept.deleted_at) throw new HttpError(404, 'DEPARTMENT_NOT_FOUND');

  const isMember = await this.repo.isMember(newLeaderUserId, deptId);
  if (!isMember) throw new HttpError(400, 'USER_NOT_MEMBER', 'Пользователь должен состоять в отделе');

  // Оптимизация: если лидер не меняется, выходим сразу
  if (dept.leader_id === newLeaderUserId) return;

  const conn = await this.pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Снимаем роль 'lead' со старого руководителя (если он был)
    if (dept.leader_id) {
      await conn.execute(
        `UPDATE user_departments SET member_role = 'member' WHERE user_id = ? AND department_id = ?`,
        [dept.leader_id, deptId]
      );
    }

    // 2️⃣ Фиксируем нового лидера в таблице отделов
    await conn.execute(
      `UPDATE departments SET leader_id = ? WHERE id = ?`,
      [newLeaderUserId, deptId]
    );

    // 3️⃣ Назначаем новому лидеру роль 'lead' в таблице связей
    await conn.execute(
      `UPDATE user_departments SET member_role = 'lead' WHERE user_id = ? AND department_id = ?`,
      [newLeaderUserId, deptId]
    );

    await conn.commit();
    logger.info(`[Department] Leader reassigned: dept=${deptId}, old=${dept.leader_id}, new=${newLeaderUserId}`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
}