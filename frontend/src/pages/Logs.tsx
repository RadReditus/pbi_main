import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Field } from '../components/Form';
import { CodeBlock } from '../components/CodeBlock';

export default function Logs(){
  const [level,setLevel]=useState<'info'|'warn'|'error'>('info');
  const [message,setMessage]=useState('manual check');
  const [flag,setFlag]=useState('1c_edit');
  const [meta,setMeta]=useState('{"foo":"bar"}');
  const [list,setList]=useState<any>(null);

  const create=async()=>{
    await api.logs.create({ level, message, flag, meta: JSON.parse(meta), toFile: true });
    await load();
  };
  const load=async()=> setList(await api.logs.list());
  useEffect(()=>{ load(); },[]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card space-y-3">
        <div className="h1">Записать лог</div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="level" value={level} onChange={e=>setLevel(e.target.value as any)}/>
          <Field label="flag" value={flag} onChange={e=>setFlag(e.target.value)}/>
          <Field label="message" value={message} onChange={e=>setMessage(e.target.value)}/>
        </div>
        <label className="block">
          <div className="text-sm mb-1">meta (JSON)</div>
          <textarea className="input min-h-[140px]" value={meta} onChange={e=>setMeta(e.target.value)}/>
        </label>
        <button className="btn" onClick={create}>Записать</button>
      </div>
      <div className="card">
        <div className="h2 mb-2">Последние 100</div>
        <CodeBlock data={list}/>
      </div>
    </div>
  );
}
