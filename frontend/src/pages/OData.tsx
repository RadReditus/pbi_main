// frontend/src/pages/OData.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CodeBlock } from '../components/CodeBlock';

export default function OData() {
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [top, setTop] = useState<number | ''>('');

  const [preview, setPreview] = useState<any>(null);
  const [srcId, setSrcId] = useState<string>('');
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.odata.sourcesList();
        setSources(s);
        if (s?.length && !srcId) setSrcId(s[0].id);
      } catch (e) {
        console.warn('load sources failed', e);
      }
    })();
  }, []);

  const test = async () => {
    const data = await api.odata.test({
      baseUrl,
      username,
      password,
      endpoint: endpoint || undefined,
      top: typeof top === 'number' ? top : undefined,
    });
    setPreview(data);
  };

  const create = async () => {
    await api.odata.sourcesCreate({
      name: `src-${new Date().toISOString()}`,
      baseUrl,
      username,
      password,
      enabled: true,
    });
    const s = await api.odata.sourcesList();
    setSources(s);
    if (s?.length) setSrcId(s[0].id);
  };

  const fetchFull = async () => {
    if (!srcId) throw new Error('sourceId is required');
    const data = await api.odata.fetch({
      sourceId: srcId,
      endpoint,
      mode: 'full',
      top: typeof top === 'number' ? top : undefined,
    });
    setPreview(data);
  };

  const inputCls = 'input w-full';
  const labelCls = 'text-sm mb-1 block';

  return (
    <div className="grid gap-4">
      <div className="card space-y-3">
        <div className="h2">OData: проверка и загрузка</div>

        <div className="grid md:grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Base URL</span>
            <input className={inputCls} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://rts-vsrv03.rts.kz/RTS_Decaux_ZUP/odata/standard.odata/" />
          </label>

          <label>
            <span className={labelCls}>Endpoint</span>
            <input className={inputCls} value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
              placeholder="Catalog_Номенклатура" />
          </label>

          <label>
            <span className={labelCls}>Username</span>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label>
            <span className={labelCls}>Password</span>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <label>
            <span className={labelCls}>$top</span>
            <input className={inputCls} type="number"
              value={top === '' ? '' : String(top)}
              onChange={(e) => setTop(e.target.value ? Number(e.target.value) : '')} />
          </label>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={test}>Preview</button>
          <button className="btn" onClick={create}>Сохранить источник</button>
        </div>
        <CodeBlock data={preview} />
      </div>

      <div className="card space-y-3">
        <div className="h2">Источники</div>

        <div className="grid md:grid-cols-3 gap-3">
          <label>
            <span className={labelCls}>sourceId</span>
            <select className={inputCls} value={srcId} onChange={(e) => setSrcId(e.target.value)}>
              <option value="">— выбери —</option>
              {sources.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelCls}>Endpoint</span>
            <input className={inputCls} value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
              placeholder="Catalog_Номенклатура" />
          </label>

          <label>
            <span className={labelCls}>$top</span>
            <input className={inputCls} type="number"
              value={top === '' ? '' : String(top)}
              onChange={(e) => setTop(e.target.value ? Number(e.target.value) : '')} />
          </label>
        </div>

        <div>
          <button className="btn" onClick={fetchFull}>Fetch → Mongo</button>
        </div>

        <CodeBlock data={sources} />
      </div>
    </div>
  );
}
