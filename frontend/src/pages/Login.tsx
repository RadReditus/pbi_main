import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Для удобства заполняю сид-аккаунт по умолчанию
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Если уже залогинен — сразу на главную
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setErr(null);
      await login(email, password);     // ← получаем токен и профиль
      navigate('/', { replace: true }); // ← РЕДИРЕКТ на главную
    } catch (e: any) {
      setErr(e?.message || 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560, margin: '32px auto' }}>
      <div className="h1" style={{ marginBottom: 12 }}>Вход</div>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Пароль"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {err && <div className="text-sm" style={{ color: '#dc2626' }}>{err}</div>}
        <button className="btn" disabled={busy} type="submit">Войти</button>
      </form>
      <div className="text-sm" style={{ opacity: .6, marginTop: 8 }}>
        Доступные сид-учётки: admin@local/admin123, assistant@local/assistant123, user@local/user123
      </div>
    </div>
  );
}
