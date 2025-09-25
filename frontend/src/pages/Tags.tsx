import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CodeBlock } from '../components/CodeBlock';

export default function Tags(){
  const [list,setList]=useState<any[]>([]);
  const [json,setJson]=useState<string>(`{
  "name": "ignore_milk",
  "action": "IGNORE",
  "conditions": {
    "type": "Поступление",
    "where": { "field": "Номенклатура", "contains": "молоко" }
  }
}`);

  const load=()=>api.tags.list().then(setList);
  useEffect(()=>{ load(); },[]);
  const create=async()=>{ const dto=JSON.parse(json); await api.tags.create(dto); await load(); };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card space-y-3">
        <div className="h1">Создать тег</div>
        <textarea className="input min-h-[260px]" value={json} onChange={e=>setJson(e.target.value)} />
        <button className="btn" onClick={create}>Создать</button>
      </div>
      <div className="card">
        <div className="h1 mb-2">Активные теги</div>
        <CodeBlock data={list}/>
      </div>
    </div>
  );
}
