import { ReactNode } from 'react';
import { getRoles, isAuthed } from '../lib/auth';
import { Link } from 'react-router-dom';

export function Guard({ roles, children }:{ roles?: string[], children: ReactNode }) {
  if (!isAuthed()) return <div className="card">Нужен вход. <Link className="btn ml-2" to="/login">Войти</Link></div>;
  if (roles && roles.length) {
    const rs = getRoles(); const ok = roles.some(r => rs.includes(r));
    if (!ok) return <div className="card">Недостаточно прав. Нужны роли: {roles.join(', ')}</div>;
  }
  return <>{children}</>;
}
