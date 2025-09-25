export function CodeBlock({ data }: { data: any }) {
  let text = '';
  try {
    text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (e: any) {
    text = `<<unserializable>> ${e?.message || e}`;
  }
  return (
    <pre className="p-3 bg-gray-900 text-gray-100 rounded overflow-auto text-sm">
      {text || '—'}
    </pre>
  );
}
