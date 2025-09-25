import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

type Props = { children: ReactNode; allow?: Array<'ADMIN' | 'ASSISTANT' | 'USER'> };

export default function Private({ children, allow }: Props) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allow?.length) {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const ok = roles.some(r => allow.includes(r as any));
    if (!ok) return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
