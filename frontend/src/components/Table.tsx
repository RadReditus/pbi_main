export function Table({ rows }:{ rows: any[] }) {
  if (!rows?.length) return <div className="text-slate-500">Нет данных</div>;
  const cols = Array.from(new Set(rows.flatMap(r=>Object.keys(r))));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead className="bg-slate-100">
          <tr>{cols.map(c=> <th key={c} className="text-left px-3 py-2 border">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="odd:bg-white even:bg-slate-50">
              {cols.map(c=> <td key={c} className="px-3 py-2 border text-sm">{String(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
