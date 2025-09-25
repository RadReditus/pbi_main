import { useEffect, useState } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { session } from '../lib/session';

type TableCounter = {
  id: string;
  tableName: string;
  baseUrl: string;
  collectionName: string;
  currentCount: number;
  lastSyncedCount: number;
  needsUpdate: boolean;
  lastCheckedAt: string | null;
  lastUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SyncResult = {
  tableName: string;
  strategy: 'full' | 'incremental' | 'skip';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  duration: number;
};

type MonitoringStats = {
  totalTables: number;
  upToDateTables: number;
  needsUpdateTables: number;
  lastCheckTime: string | null;
};

type MonitoringStatus = {
  enabled: boolean;
};

type ServiceStatus = {
  name: string;
  enabled: boolean;
  running: boolean;
  lastRun?: string;
  lastError?: string;
  nextRun?: string;
};

type ServicesStats = {
  total: number;
  enabled: number;
  running: number;
  withErrors: number;
};

export default function Monitoring() {
  const [counters, setCounters] = useState<TableCounter[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [servicesStats, setServicesStats] = useState<ServicesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseHeaders: Record<string, string> = {
    'x-api-key': session.apiKey || '',
  };
  if (session.token) baseHeaders['Authorization'] = `Bearer ${session.token}`;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем счетчики
      const countersRes = await fetch('/api/v1/monitoring/counters', { headers: baseHeaders });
      if (!countersRes.ok) throw new Error(await countersRes.text());
      setCounters(await countersRes.json());

      // Загружаем статистику
      const statsRes = await fetch('/api/v1/monitoring/stats', { headers: baseHeaders });
      if (!statsRes.ok) throw new Error(await statsRes.text());
      setStats(await statsRes.json());

      // Загружаем статус мониторинга
      const statusRes = await fetch('/api/v1/monitoring/status', { headers: baseHeaders });
      if (!statusRes.ok) throw new Error(await statusRes.text());
      setMonitoringStatus(await statusRes.json());

      // Загружаем статус сервисов
      const servicesRes = await fetch('/api/v1/monitoring/services', { headers: baseHeaders });
      if (!servicesRes.ok) throw new Error(await servicesRes.text());
      setServices(await servicesRes.json());

      // Загружаем статистику сервисов
      const servicesStatsRes = await fetch('/api/v1/monitoring/services/stats', { headers: baseHeaders });
      if (!servicesStatsRes.ok) throw new Error(await servicesStatsRes.text());
      setServicesStats(await servicesStatsRes.json());

    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const forceCheckAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/monitoring/force-check', { 
        method: 'POST', 
        headers: baseHeaders 
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка принудительной проверки');
    } finally {
      setLoading(false);
    }
  };

  const forceSyncTable = async (tableName: string, strategy: 'smart' | 'full' = 'smart') => {
    try {
      setLoading(true);
      setError(null);
      
      if (strategy === 'smart') {
        // Используем существующий endpoint мониторинга
        const res = await fetch(`/api/v1/monitoring/force-sync/${encodeURIComponent(tableName)}`, { 
          method: 'POST', 
          headers: baseHeaders 
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // Используем новый endpoint умной синхронизации
        const counter = counters.find(c => c.tableName === tableName);
        if (!counter) throw new Error('Table counter not found');
        
        const res = await fetch('/api/v1/sync/table', {
          method: 'POST',
          headers: { ...baseHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: counter.tableName,
            baseUrl: counter.baseUrl,
            collectionName: counter.collectionName,
            options: { forceFullSync: strategy === 'full' }
          })
        });
        if (!res.ok) throw new Error(await res.text());
      }
      
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка принудительной синхронизации');
    } finally {
      setLoading(false);
    }
  };

  const toggleMonitoring = async (enable: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/monitoring/${enable ? 'enable' : 'disable'}`, { 
        method: 'POST', 
        headers: baseHeaders 
      });
      if (!res.ok) throw new Error(await res.text());
      await loadData();
    } catch (e: any) {
      setError(e?.message || `Ошибка ${enable ? 'включения' : 'отключения'} мониторинга`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Мониторинг OData источников</h1>
          {monitoringStatus && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${
                monitoringStatus.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {monitoringStatus.enabled ? 'Активен' : 'Отключен'}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => toggleMonitoring(!monitoringStatus.enabled)}
                disabled={loading}
              >
                {monitoringStatus.enabled ? 'Отключить' : 'Включить'}
              </button>
            </div>
          )}
        </div>
        <button 
          className="btn" 
          onClick={forceCheckAll} 
          disabled={loading}
        >
          {loading ? 'Проверяю...' : 'Принудительная проверка'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Статистика сервисов */}
      {servicesStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-600">Всего сервисов</div>
            <div className="text-2xl font-bold">{servicesStats.total}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Включены</div>
            <div className="text-2xl font-bold text-blue-600">{servicesStats.enabled}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Запущены</div>
            <div className="text-2xl font-bold text-green-600">{servicesStats.running}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">С ошибками</div>
            <div className="text-2xl font-bold text-red-600">{servicesStats.withErrors}</div>
          </div>
        </div>
      )}

      {/* Статус сервисов */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Статус сервисов</h2>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <span className="font-medium">{service.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  service.enabled 
                    ? (service.running ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {service.enabled ? (service.running ? 'Запущен' : 'Остановлен') : 'Отключен'}
                </span>
                {service.lastError && (
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                    Ошибка
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {service.lastRun && `Последний запуск: ${formatDate(service.lastRun)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Статистика мониторинга */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-600">Всего таблиц</div>
            <div className="text-2xl font-bold">{stats.totalTables}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Актуальные</div>
            <div className="text-2xl font-bold text-green-600">{stats.upToDateTables}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Требуют обновления</div>
            <div className="text-2xl font-bold text-orange-600">{stats.needsUpdateTables}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Последняя проверка</div>
            <div className="text-sm">{formatDate(stats.lastCheckTime)}</div>
          </div>
        </div>
      )}

      {/* Таблица счетчиков */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Счетчики таблиц</h2>
          <button 
            className="btn btn-sm" 
            onClick={loadData} 
            disabled={loading}
          >
            Обновить
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Таблица</th>
                <th className="text-left p-2">Коллекция</th>
                <th className="text-left p-2">URL</th>
                <th className="text-left p-2">Текущее кол-во</th>
                <th className="text-left p-2">Синхронизировано</th>
                <th className="text-left p-2">Статус</th>
                <th className="text-left p-2">Последняя проверка</th>
                <th className="text-left p-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((counter) => (
                <tr key={counter.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-sm">{counter.tableName}</td>
                  <td className="p-2">{counter.collectionName}</td>
                  <td className="p-2 text-sm text-gray-600 max-w-xs truncate" title={counter.baseUrl}>
                    {counter.baseUrl}
                  </td>
                  <td className="p-2 font-mono">{counter.currentCount.toLocaleString()}</td>
                  <td className="p-2 font-mono">{counter.lastSyncedCount.toLocaleString()}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      counter.needsUpdate 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {counter.needsUpdate ? 'Требует обновления' : 'Актуально'}
                    </span>
                  </td>
                  <td className="p-2 text-sm text-gray-600">
                    {formatDate(counter.lastCheckedAt)}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {counter.needsUpdate && (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => forceSyncTable(counter.tableName, 'smart')}
                            disabled={loading}
                            title="Умная синхронизация (только новые записи)"
                          >
                            Умная
                          </button>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => forceSyncTable(counter.tableName, 'full')}
                            disabled={loading}
                            title="Полная синхронизация (перезаписать все)"
                          >
                            Полная
                          </button>
                        </>
                      )}
                      {!counter.needsUpdate && (
                        <button
                          className="btn btn-sm"
                          onClick={() => forceSyncTable(counter.tableName, 'smart')}
                          disabled={loading}
                          title="Принудительная проверка"
                        >
                          Проверить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {counters.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Нет данных о таблицах
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Отладочная информация */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Отладочная информация</h3>
        <CodeBlock data={{ counters, stats }} />
      </div>
    </div>
  );
}
