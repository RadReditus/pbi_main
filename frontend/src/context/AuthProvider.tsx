import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { session } from '../lib/session';

type User = { id: string; email: string; roles: string[] } | null;

type Ctx = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  async login() {},
  logout() {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);

  // 1) Автоподхват API-ключа из VITE_API_KEY (если ещё не сохранён)
  useEffect(() => {
    if (!session.apiKey) {
      const k = (import.meta.env.VITE_API_KEY || '').trim();
      if (k) session.apiKey = k;
    }
  }, []);

  // 2) Восстанавливаем пользователя из localStorage (быстрый рендер)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // 3) Если есть токен в session — валидируем и обновляем профиль
  useEffect(() => {
    (async () => {
      try {
        if (session.token) {
          const me = await api.auth.me();
          setUser(me);
          try { localStorage.setItem('user', JSON.stringify(me)); } catch {}
        }
      } catch {
        // токен невалиден — чистим
        session.clear();
        setUser(null);
        try { localStorage.removeItem('user'); } catch {}
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken } = await api.auth.login(email, password);
    session.token = accessToken;
    const me = await api.auth.me();
    setUser(me);
    try { localStorage.setItem('user', JSON.stringify(me)); } catch {}
  };

  const logout = () => {
    session.clear();
    setUser(null);
    try { localStorage.removeItem('user'); } catch {}
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
