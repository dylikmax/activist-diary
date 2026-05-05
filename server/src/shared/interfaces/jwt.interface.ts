export interface JwtPayload {
  id: string;
  role: 'activist' | 'subdept_lead' | 'dept_lead' | 'secretary' | 'vice_chair' | 'chair' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  iat?: number;
  exp?: number;
}