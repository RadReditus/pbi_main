import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CodeBlock } from '../components/CodeBlock';
import { useAuth } from '../context/AuthProvider';
import { can } from '../lib/acl';

export default function Records(){
  const { user } = useAuth();
  const roles = (user?.roles as string[]) || [];

  const [ingest,setIngest]=useState<string>(`{
  "items": [
    { "uid": "1c-001", "type": "Поступление", "payload": { "Номенклатура": "молоко 2.5%", "Сумма": 1000 } },
    { "uid": "1c-002", "type": "Поступление", "payload": { "Номенклатура": "кефир", "Сумма": 1200 } }
  ]
}`);
  const [filtered,setFiltered]=useState<any>(null);
  const [tagged,setTagged]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string | null>(null);

  const load = async()=> {
    try { setFiltered(await api.records.filtered()); } catch(e:any){ setFiltered({error:e.message}); }
    try { setTagged(await api.records.tagged()); } catch(e:any){ setTagged({error:e.message}); }
  };
  useEffect(()=>{ load(); },[]);

  const sendIngest = async () => {
    try {
      setBusy(true); setErr(null);
      const parsed = JSON.parse(ingest);
      const body = Array.isArray(parsed) ? { items: parsed } : parsed;
      await api.records.ingest(body);
      await load();
    } catch (e:any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const promote = async () => {
    try {
      setBusy(true); setErr(null);
      await api.records.promote({});
      await load();
    } catch (e:any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card space-y-3">
        <div className="h1">Ingest / Promote</div>

        {can('tag', roles) ? (
          <>
            <textarea className="input min-h-[240px]" value={ingest} onChange={e=>setIngest(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn" disabled={busy} onClick={sendIngest}>Загрузить</button>
              <button className="btn" disabled={busy} onClick={promote}>Promote</button>
            </div>
            {err && <div className="text-red-600 text-sm">{err}</div>}
          </>
        ) : (
          <div className="text-sm opacity-70">
            У вас нет прав на загрузку и тегирование. Доступно для ролей: ADMIN, ASSISTANT.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="h2 mb-2">filtered</div>
          <CodeBlock data={filtered}/>
        </div>
        <div className="card">
          <div className="h2 mb-2">tagged</div>
          <CodeBlock data={tagged}/>
        </div>
      </div>
    </div>
  );
}
