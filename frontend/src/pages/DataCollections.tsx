import { useEffect, useState } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { session } from '../lib/session';

interface CollectionMeta {
  baseUrl: string;
  collectionName: string;
  lastCheckTime: string;
  recordsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SummaryData {
  totalCollections: number;
  totalRecords: number;
  lastUpdate: string | null;
  collectionsByBaseUrl: Record<string, Array<{
    name: string;
    recordsCount: number;
    lastCheckTime: string;
  }>>;
}

export default function DataCollections() {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseHeaders: Record<string, string> = {
    'x-api-key': session.apiKey || '',
  };
  if (session.token) baseHeaders['Authorization'] = `Bearer ${session.token}`;

  const loadCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [collectionsRes, summaryRes] = await Promise.all([
        fetch('/api/v1/datas-collections', { headers: baseHeaders }),
        fetch('/api/v1/datas-collections/summary', { headers: baseHeaders })
      ]);

      if (!collectionsRes.ok) throw new Error(`Collections: ${await collectionsRes.text()}`);
      if (!summaryRes.ok) throw new Error(`Summary: ${await summaryRes.text()}`);

      setCollections(await collectionsRes.json());
      setSummary(await summaryRes.json());
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="h1 mb-4">Метаданные коллекций OData</div>
        
        <div className="flex gap-4 mb-4">
          <button 
            className="btn" 
            onClick={loadCollections} 
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}

        {summary && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="card bg-blue-50">
              <div className="text-sm text-gray-600">Всего коллекций</div>
              <div className="text-2xl font-bold">{summary.totalCollections}</div>
            </div>
            <div className="card bg-green-50">
              <div className="text-sm text-gray-600">Всего записей</div>
              <div className="text-2xl font-bold">{summary.totalRecords.toLocaleString()}</div>
            </div>
            <div className="card bg-yellow-50">
              <div className="text-sm text-gray-600">Последнее обновление</div>
              <div className="text-sm font-medium">
                {summary.lastUpdate ? formatDate(summary.lastUpdate) : 'Нет данных'}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="h2 mb-2">Все коллекции</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Base URL</th>
                    <th className="text-left p-2">Коллекция</th>
                    <th className="text-left p-2">Записей</th>
                    <th className="text-left p-2">Последняя проверка</th>
                    <th className="text-left p-2">Создана</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((col, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm font-mono">{col.baseUrl}</td>
                      <td className="p-2 font-medium">{col.collectionName}</td>
                      <td className="p-2 text-right">{col.recordsCount.toLocaleString()}</td>
                      <td className="p-2 text-sm">{formatDate(col.lastCheckTime)}</td>
                      <td className="p-2 text-sm">{formatDate(col.createdAt)}</td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        Нет данных о коллекциях
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="h2 mb-2">Сводка по источникам</h3>
            <CodeBlock data={summary?.collectionsByBaseUrl || {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

