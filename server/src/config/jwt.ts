import { env } from './env';

export const jwtConfig = {
  access: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  refresh: {
    secret: env.REFRESH_JWT_SECRET,
    expiresIn: env.REFRESH_JWT_EXPIRES_IN,
  },
} as const;