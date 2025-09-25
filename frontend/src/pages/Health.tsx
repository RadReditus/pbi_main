import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CodeBlock } from '../components/CodeBlock';
export default function Health(){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{ api.health().then(setData).catch(e=>setData({error:e.message})) },[]);
  return <div className="card"><div className="h1 mb-2">Health</div><CodeBlock data={data}/></div>;
}
