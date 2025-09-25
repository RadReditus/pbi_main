import { useState } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { session } from '../lib/session';

export default function Export() {
  const [jsonData, setJsonData] = useState<any>(null);
  const [sqlText, setSqlText] = useState<string>('');
  const [busyJson, setBusyJson] = useState(false);
  const [busySql, setBusySql] = useState(false);
  const [errJ, setErrJ] = useState<string | null>(null);
  const [errS, setErrS] = useState<string | null>(null);

  const baseHeaders: Record<string, string> = {
    'x-api-key': session.apiKey || '',
  };
  if (session.token) baseHeaders['Authorization'] = `Bearer ${session.token}`;

  const fetchJson = async () => {
    try {
      setBusyJson(true); setErrJ(null);
      const res = await fetch('/api/v1/export/json', { headers: { ...baseHeaders, 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(await res.text());
      setJsonData(await res.json());
    } catch (e: any) {
      setErrJ(e?.message || 'Ошибка');
    } finally { setBusyJson(false); }
  };

  const fetchSql = async () => {
    try {
      setBusySql(true); setErrS(null);
      // ВАЖНО: читаем текст, а не .json()
      const res = await fetch('/api/v1/export/sql', { headers: { ...baseHeaders, 'Accept': 'text/plain' } });
      if (!res.ok) throw new Error(await res.text());
      setSqlText(await res.text());
    } catch (e: any) {
      setErrS(e?.message || 'Ошибка');
    } finally { setBusySql(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="h2 mb-2">Export JSON</div>
        <button className="btn" onClick={fetchJson} disabled={busyJson}>
          {busyJson ? 'Получаю…' : 'Получить'}
        </button>
        {errJ && <div className="text-sm" style={{color:'#dc2626', marginTop:8}}>{errJ}</div>}
        <div className="mt-3"><CodeBlock data={jsonData} /></div>
      </div>

      <div className="card">
        <div className="h2 mb-2">Export SQL</div>
        <button className="btn" onClick={fetchSql} disabled={busySql}>
          {busySql ? 'Получаю…' : 'Получить'}
        </button>
        {errS && <div className="text-sm" style={{color:'#dc2626', marginTop:8}}>{errS}</div>}
        <div className="mt-3">
          <textarea
            className="input"
            style={{minHeight:180, fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace'}}
            value={sqlText || ''}
            onChange={()=>{}}
            readOnly
            placeholder="—"
          />
        </div>
      </div>
    </div>
  );
}
