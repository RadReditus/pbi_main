import { useState } from 'react';
import { session } from '../lib/session';

export function ApiKeyBar() {
  const [val, setVal] = useState(session.apiKey || '');

  // если ключ уже есть — ничего не показываем
  if (session.apiKey) return null;

  const save = () => {
    session.apiKey = val.trim();
    location.reload();
  };

  return (
    <div style={{background:'#fff3cd', borderBottom:'1px solid #fde68a', padding: '8px 12px'}}>
      <span style={{marginRight:8}}>API key:</span>
      <input
        className="input"
        style={{width:280, display:'inline-block', marginRight:8}}
        value={val}
        onChange={e=>setVal(e.target.value)}
        placeholder="вставь ключ сюда"
      />
      <button className="btn" onClick={save}>Сохранить</button>
    </div>
  );
}
