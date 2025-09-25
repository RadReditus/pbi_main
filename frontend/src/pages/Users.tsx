import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { session } from '../lib/session';

type UserRow = { id: string; email: string; roles: string[] };

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(['USER']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSee = useMemo(
    () => !!user && user.roles.some(r => r === 'ADMIN' || r === 'ASSISTANT'),
    [user]
  );

  // локальные guard’ы на всякий случай
  if (!user) {
    return <div className="card">Нужен вход. <a className="btn" href="/login">Войти</a></div>;
  }
  if (!canSee) {
    return <div className="card">403 — нет прав.</div>;
  }

  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    'x-api-key': session.apiKey || '',
  };
  if (session.token) headers['Authorization'] = `Bearer ${session.token}`;

  const load = async () => {
    try {
      setErr(null);
      const res = await fetch('/api/v1/users', { headers });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(data || []);
    } catch (e:any) {
      setErr(e?.message || 'Ошибка загрузки пользователей');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleRole = (r: string, checked: boolean) => {
    setRoles(prev => {
      const set = new Set(prev);
      if (checked) set.add(r); else set.delete(r);
      return Array.from(set);
    });
  };

  const createUser = async () => {
    try {
      setBusy(true); setErr(null);
      const body = JSON.stringify({ email, password, roles });
      const res = await fetch('/api/v1/users', { method:'POST', headers, body });
      if (!res.ok) throw new Error(await res.text());
      setEmail(''); setPassword(''); setRoles(['USER']);
      await load();
    } catch (e:any) {
      setErr(e?.message || 'Ошибка создания пользователя');
    } finally { setBusy(false); }
  };

  const updateRoles = async (id: string, newRoles: string[]) => {
    try {
      setBusy(true); setErr(null);
      const body = JSON.stringify({ roles: newRoles });
      const res = await fetch(`/api/v1/users/${id}/roles`, { method:'PATCH', headers, body });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e:any) {
      setErr(e?.message || 'Ошибка изменения ролей');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="h2 mb-2">Создать пользователя</div>
        <div className="space-y-3">
          <input className="input" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="text-sm">Роли:</div>
          <div className="text-sm" style={{display:'flex', gap:12}}>
            {['ADMIN','ASSISTANT','USER'].map(r => (
              <label key={r} style={{display:'flex', alignItems:'center', gap:6}}>
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={e=>toggleRole(r, e.target.checked)}
                />
                {r}
              </label>
            ))}
          </div>
          <button className="btn" onClick={createUser} disabled={busy || !email || !password}>Создать</button>
        </div>
        {err && <div className="text-sm" style={{color:'#dc2626', marginTop:8}}>{err}</div>}
      </div>

      <div className="card">
        <div className="h2 mb-2">Пользователи</div>
        <div className="text-sm" style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'8px'}}>Email</th>
                <th style={{textAlign:'left', padding:'8px'}}>Роли</th>
                <th style={{textAlign:'left', padding:'8px'}}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id}>
                  <td style={{padding:'8px', borderTop:'1px solid #eee'}}>{u.email}</td>
                  <td style={{padding:'8px', borderTop:'1px solid #eee'}}>{u.roles.join(', ')}</td>
                  <td style={{padding:'8px', borderTop:'1px solid #eee'}}>
                    {['ADMIN','ASSISTANT','USER'].map(r => {
                      const next = u.roles.includes(r)
                        ? u.roles.filter(x=>x!==r)
                        : [...u.roles, r];
                      return (
                        <button
                          key={r}
                          className="btn"
                          style={{marginRight:6, opacity: u.roles.includes(r) ? 1 : .75}}
                          onClick={()=>updateRoles(u.id, next)}
                          disabled={busy}
                          title={u.roles.includes(r) ? `Убрать ${r}` : `Добавить ${r}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={3} style={{padding:'12px', color:'#6b7280'}}>Нет пользователей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
