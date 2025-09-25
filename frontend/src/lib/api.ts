import { session } from './session';

const ROOT = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_PREFIX = '/api/v1';

function buildQuery(q?: Record<string, any>) {
  if (!q) return '';
  const usp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((el) => usp.append(k, String(el)));
    else usp.append(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

async function req<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  opts: { auth?: boolean; query?: Record<string, any>; prefix?: boolean } = {}
): Promise<T> {
  const usePrefix = opts.prefix !== false;
  const base = ROOT || '';               // ← если VITE_API_URL пуст, ходим на /api (проксирует nginx)
  const url = base + (usePrefix ? API_PREFIX : '') + path + buildQuery(opts.query);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session.apiKey) headers['x-api-key'] = session.apiKey;
  if (opts.auth !== false && session.token) headers['Authorization'] = `Bearer ${session.token}`;

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => req<any>('GET', '/health', undefined, { prefix: false, auth: false }),
  auth: {
    login: (email: string, password: string) => req<{ accessToken: string }>('POST', '/auth/login', { email, password }, { auth: false }),
    me: () => req<any>('GET', '/auth/me'),
  },
  users: {
    list: () => req<any[]>('GET', '/users'),
    create: (dto: any) => req<any>('POST', '/users', dto),
    setRoles: (id: string, roles: string[]) => req<any>('PATCH', `/users/${id}/roles`, { roles }),
  },
  tags: {
    list: () => req<any[]>('GET', '/tags'),
    create: (dto: any) => req<any>('POST', '/tags', dto),
  },
  logs: {
    list: () => req<any[]>('GET', '/logs', undefined, { auth: false }),
    add: (dto: any) => req<any>('POST', '/logs', dto, { auth: false }),
    create: (dto: any) => req<any>('POST', '/logs', dto, { auth: false }), // alias
  },
  records: {
    ingest: (dto: any) => req<any>('POST', '/records/ingest', dto, { auth: false }),
    promote: (dto: any) => req<any>('POST', '/records/promote', dto, { auth: false }),
    filtered: (q?: any) => req<any[]>('GET', '/records/filtered', undefined, { auth: false, query: q }),
    tagged: (q?: any) => req<any[]>('GET', '/records/tagged', undefined, { auth: false, query: q }),
  },
  export: {
    json: (q?: any) => req<any>('GET', '/export/json', undefined, { auth: false, query: q }),
    sql: (q?: any) => req<any>('GET', '/export/sql', undefined, { auth: false, query: q }),
  },
  odata: {
    test: (dto: any) => req<any>('POST', '/odata/test', dto),
    sourcesCreate: (dto: any) => req<any>('POST', '/odata/sources', dto),
    sourcesList: () => req<any[]>('GET', '/odata/sources'),
    fetch: (q: { sourceId: string; endpoint: string; mode?: 'full'|'delta'; since?: string; top?: number }) =>
      req<any>('GET', '/odata/fetch', undefined, { auth: false, query: q }),
  },
};
