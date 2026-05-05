import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt';
import { AuthRepository, UserRecord } from './auth.repository';
import { AuthTokens, UserSafePayload } from './auth.dto';
import { HttpError } from '../../shared/utils/http-error';
import logger from '../../config/logger';

export class AuthService {
  private repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  private generateTokens(user: UserRecord): AuthTokens {
    const payload = { id: user.id, role: user.role, status: user.status };
    const accessToken = jwt.sign(payload, jwtConfig.access.secret, { expiresIn: jwtConfig.access.expiresIn });
    const refreshToken = jwt.sign(payload, jwtConfig.refresh.secret, { expiresIn: jwtConfig.refresh.expiresIn });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserRecord): UserSafePayload {
    const { password_hash: _, deleted_at: __, ...safe } = user;
    return safe;
  }

  async register(data: { login: string; email: string; password: string }): Promise<void> {
    const existing = await this.repo.findByLoginOrEmail(data.login);
    if (existing) throw new HttpError(409, 'USER_ALREADY_EXISTS', 'Login or email is already taken');

    const passwordHash = await bcrypt.hash(data.password, 12);
    await this.repo.createUser({ ...data, passwordHash, role: 'activist' });
    logger.info(`[Auth] New user registered: ${data.login}`);
  }

  async login(data: { login: string; password: string }): Promise<{ user: UserSafePayload; tokens: AuthTokens }> {
    const user = await this.repo.findByLoginOrEmail(data.login);
    if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid login or password');
    if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_INACTIVE', 'Account is not active');

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid login or password');

    const tokens = this.generateTokens(user);
    logger.info(`[Auth] User logged in: ${user.id}`);
    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, jwtConfig.refresh.secret);
      const userId = (payload as jwt.JwtPayload).id;
      if (!userId) throw new HttpError(401, 'INVALID_TOKEN_PAYLOAD');

      // В production здесь рекомендуется проверять токен в БД/Redis для возможности принудительного отзыва
      return this.generateTokens({ id: userId } as UserRecord);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new HttpError(401, 'TOKEN_EXPIRED', 'Refresh token expired');
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findByLoginOrEmail(email);
    if (!user) {
      // Возвращаем 200 в любом случае для защиты от enumeration-атак
      logger.warn(`[Auth] Forgot password requested for unknown email: ${email}`);
      return;
    }

    // TODO: Интеграция с Email Service (Nodemailer/SendGrid)
    // const resetToken = jwt.sign({ id: user.id }, jwtConfig.access.secret, { expiresIn: '15m' });
    // await emailService.sendPasswordReset(user.email, resetToken);
    logger.info(`[Auth] Password reset flow triggered for: ${email}`);
  }
}