import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

function hasAny(user: { roles: string[] } | null, need: string[]) {
  if (!need?.length) return true;
  const roles = user?.roles || [];
  return roles.some(r => need.includes(r));
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = [
    { to: '/records', label: 'Records', roles: ['ADMIN','ASSISTANT','USER'] },
    { to: '/users',   label: 'Users',   roles: ['ADMIN','ASSISTANT'] },
    { to: '/tags',    label: 'Tags',    roles: ['ADMIN','ASSISTANT'] },
    { to: '/logs',    label: 'Logs',    roles: ['ADMIN'] },
    { to: '/odata',   label: 'OData',   roles: ['ADMIN','ASSISTANT'] },
    { to: '/collections', label: 'Collections', roles: ['ADMIN','ASSISTANT'] },
    { to: '/monitoring', label: 'Monitoring', roles: ['ADMIN','ASSISTANT'] },
    { to: '/settings', label: 'Settings', roles: ['ADMIN'] },
    { to: '/export',  label: 'Export',  roles: ['ADMIN'] },
  ].filter(i => hasAny(user, i.roles));

  return (
    <div style={{
      background:'#111827', color:'#fff', padding:'10px 16px',
      display:'flex', alignItems:'center', justifyContent:'space-between'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <div style={{fontWeight:700, marginRight:8}}>PBI Exchange</div>
        {items.map(i => (
          <NavLink
            key={i.to}
            to={i.to}
            style={({isActive})=>({
              color:'#fff', textDecoration:'none', padding:'6px 10px',
              borderRadius:8, background: isActive ? '#374151' : 'transparent',
              opacity: isActive ? 1 : .8
            })}
          >
            {i.label}
          </NavLink>
        ))}
      </div>

      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {user && (
          <div className="text-sm" style={{opacity:.85}}>
            {user.email} <span style={{opacity:.7}}>({user.roles.join(',')})</span>
          </div>
        )}
        <button
          className="btn btn-danger"
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
