import { UserRepository } from './users.repository';
import { ListUsersInput, UpdateUserInput, UserPublicDTO } from './users.dto';
import { HttpError } from '../../shared/utils/http-error';
import logger from '../../config/logger';

export class UserService {
  private repo = new UserRepository();

  async listUsers(input: ListUsersInput) {
    return this.repo.findWithPagination(input);
  }

  async updateUser(targetId: string, data: UpdateUserInput, actorId: string): Promise<UserPublicDTO> {
    const user = await this.repo.findById(targetId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND');

    // Проверка на занятость логина/email
    if (data.login || data.email) {
      const exists = await this.repo.findConflictingCredentials(data.login, data.email, targetId);
      if (exists) throw new HttpError(409, 'CREDENTIALS_TAKEN', 'Login or email already in use');
    }

    // 🔒 Защита: админ не может снять с себя роль или заблокировать себя
    if (targetId === actorId) {
      if (data.role && data.role !== 'admin') {
        throw new HttpError(403, 'SELF_DEMOTE_FORBIDDEN', 'Cannot remove admin role from yourself');
      }
      if (data.status && data.status !== 'active') {
        throw new HttpError(403, 'SELF_BLOCK_FORBIDDEN', 'Cannot block your own account');
      }
    }

    await this.repo.update(targetId, data);
    const updated = await this.repo.findById(targetId);
    if (!updated) throw new HttpError(500, 'UPDATE_FAILED', 'User not found after update');

    logger.info(`[User] Updated: ${targetId} by ${actorId} | Changes: ${JSON.stringify(data)}`);
    return updated;
  }
}