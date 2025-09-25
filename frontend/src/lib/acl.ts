export type Role = 'ADMIN' | 'ASSISTANT' | 'USER';

const ACL: Record<string, Role[]> = {
  viewData:   ['ADMIN', 'ASSISTANT', 'USER'],
  tag:        ['ADMIN', 'ASSISTANT'], // ingest/promote
  manageUsers:['ADMIN', 'ASSISTANT'],
  exportData: ['ADMIN'],
  viewLogs:   ['ADMIN'],
  manageOData:['ADMIN'],
  deleteData: ['ADMIN'],
};

export function can(cap: keyof typeof ACL, roles: string[] | undefined | null) {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(r => (ACL[cap] as string[]).includes(r));
}
