export type Role = 'activist' | 'dept_lead' | 'secretary' | 'vice_chair' | 'chair' | 'admin';
export type RouteRole = 'any' | 'dept_lead+' | 'secretary+' | 'vice_chair+' | 'chair+';

const ROLE_HIERARCHY: Record<Role, number> = {
  activist: 1,
  dept_lead: 2,
  secretary: 3,
  vice_chair: 4,
  chair: 5,
  admin: 6,
};

const ROLE_GROUPS: Record<RouteRole, Role[]> = {
  'any': ['activist', 'dept_lead', 'secretary', 'vice_chair', 'chair', 'admin'],
  'dept_lead+': ['dept_lead', 'secretary', 'vice_chair', 'chair', 'admin'],
  'secretary+': ['secretary', 'vice_chair', 'chair', 'admin'],
  'vice_chair+': ['vice_chair', 'chair', 'admin'],
  'chair+': ['chair', 'admin'],
};

export const canAccessRoute = (userRole: Role, required: RouteRole[]): boolean => {
  const allowedRoles = required.flatMap(r => ROLE_GROUPS[r]);
  return allowedRoles.includes(userRole);
};

export const hasRole = (userRole: Role, minRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
};