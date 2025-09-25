export function Field({label, ...p}:{label:string} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <div className="text-sm mb-1">{label}</div>
      <input className="input" {...p}/>
    </label>
  );
}
