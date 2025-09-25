import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getRoles, isAuthed, logout } from '../lib/auth';

export function Nav() {
  const navigate = useNavigate();
  const roles = getRoles();
  const isAdmin = roles.includes('ADMIN');
  const isAssistant = roles.includes('ASSISTANT');

  const item = (to:string, label:string) => (
    <NavLink to={to} className={({isActive}) =>
      `px-3 py-2 rounded-xl ${isActive?'bg-indigo-600 text-white':'hover:bg-slate-200'}`
    }>{label}</NavLink>
  );

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="font-semibold">PBI Exchange</Link>
        <div className="flex items-center gap-2 flex-wrap">
          {item('/health','Health')}
          {item('/settings','Settings')}
          {item('/tags','Tags')}
          {item('/records','Records')}
          {item('/export','Export')}
          {item('/odata','OData')}
          {item('/logs','Logs')}
          {(isAdmin || isAssistant) && item('/users','Users')}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isAuthed()
          ? <button className="btn" onClick={()=>{ logout(); navigate('/login'); }}>Выйти</button>
          : <Link className="btn" to="/login">Войти</Link>}
        </div>
      </div>
    </header>
  );
}
