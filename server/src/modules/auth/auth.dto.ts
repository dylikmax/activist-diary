import { z } from 'zod';

export const registerSchema = z.object({
  login: z.string().min(3).max(50).trim(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  login: z.string().trim(),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSafePayload {
  id: string;
  login: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}