import { loadSettings, saveSettings } from './store';
import jwtDecode from 'jwt-decode';

export type JwtPayload = { sub: string; email: string; roles?: string[]; exp?: number };
export function getToken() { return loadSettings().jwtToken || ''; }
export function setToken(token: string) { saveSettings({ jwtToken: token }); }
export function getRoles(): string[] {
  const t = getToken(); if (!t) return [];
  try { const p = jwtDecode<JwtPayload>(t); return p.roles || []; } catch { return []; }
}
export function isAuthed() { return !!getToken(); }
export function logout() { saveSettings({ jwtToken: '' }); }
