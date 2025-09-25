import { useEffect, useState } from 'react';
import { session } from '../lib/session';

type AppSettings = {
  app: {
    port: number;
    nodeEnv: string;
  };
  dataServices: {
    source1c: {
      enabled: boolean;
      delayMs: number;
      username: string;
      password: string;
      timeoutMs: number;
      links: Array<{ url: string; name?: string }>;
    };
    getScopeOneC: {
      enabled: boolean;
      delayMs: number;
      username: string;
      password: string;
      timeoutMs: number;
      baseUrls: string[];
    };
  };
  monitoring: {
    enabled: boolean;
    delayMs: number;
    cronExpression: string;
  };
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const baseHeaders: Record<string, string> = {
    'x-api-key': session.apiKey || '',
  };
  if (session.token) baseHeaders['Authorization'] = `Bearer ${session.token}`;

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/config/settings', { headers: baseHeaders });
      if (!res.ok) throw new Error(await res.text());
      setSettings(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const updateServiceEnabled = async (serviceName: 'source1c' | 'getScopeOneC', enabled: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const res = await fetch('/api/v1/config/services/enable', {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, enabled })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      setSuccess(`Сервис ${serviceName} ${enabled ? 'включен' : 'отключен'}`);
      await loadSettings();
    } catch (e: any) {
      setError(e?.message || 'Ошибка обновления настроек');
    } finally {
      setLoading(false);
    }
  };

  const updateMonitoringEnabled = async (enabled: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const res = await fetch('/api/v1/config/monitoring/enable', {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      setSuccess(`Мониторинг ${enabled ? 'включен' : 'отключен'}`);
      await loadSettings();
    } catch (e: any) {
      setError(e?.message || 'Ошибка обновления настроек');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading && !settings) {
    return <div className="card">Загрузка настроек...</div>;
  }

  if (!settings) {
    return <div className="card">Ошибка загрузки настроек</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Настройки системы</h1>
        <button 
          className="btn" 
          onClick={loadSettings} 
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Настройки сервисов загрузки данных */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Сервисы загрузки данных</h2>
        
        <div className="space-y-4">
          {/* Source1C Service */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Source1C Service</h3>
              <button
                className={`btn ${settings.dataServices.source1c.enabled ? 'btn-danger' : 'btn-success'}`}
                onClick={() => updateServiceEnabled('source1c', !settings.dataServices.source1c.enabled)}
                disabled={loading}
              >
                {settings.dataServices.source1c.enabled ? 'Отключить' : 'Включить'}
              </button>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Статус: <span className={settings.dataServices.source1c.enabled ? 'text-green-600' : 'text-red-600'}>
                {settings.dataServices.source1c.enabled ? 'Включен' : 'Отключен'}
              </span></div>
              <div>Задержка запуска: {settings.dataServices.source1c.delayMs}мс</div>
              <div>Таймаут: {settings.dataServices.source1c.timeoutMs}мс</div>
              <div>Пользователь: {settings.dataServices.source1c.username}</div>
              <div>Количество ссылок: {settings.dataServices.source1c.links.length}</div>
            </div>
          </div>

          {/* GetScopeOneC Service */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">GetScopeOneC Service</h3>
              <button
                className={`btn ${settings.dataServices.getScopeOneC.enabled ? 'btn-danger' : 'btn-success'}`}
                onClick={() => updateServiceEnabled('getScopeOneC', !settings.dataServices.getScopeOneC.enabled)}
                disabled={loading}
              >
                {settings.dataServices.getScopeOneC.enabled ? 'Отключить' : 'Включить'}
              </button>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Статус: <span className={settings.dataServices.getScopeOneC.enabled ? 'text-green-600' : 'text-red-600'}>
                {settings.dataServices.getScopeOneC.enabled ? 'Включен' : 'Отключен'}
              </span></div>
              <div>Задержка запуска: {settings.dataServices.getScopeOneC.delayMs}мс</div>
              <div>Таймаут: {settings.dataServices.getScopeOneC.timeoutMs}мс</div>
              <div>Пользователь: {settings.dataServices.getScopeOneC.username}</div>
              <div>Количество URL: {settings.dataServices.getScopeOneC.baseUrls.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Настройки мониторинга */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Мониторинг</h2>
        
        <div className="border rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Мониторинг OData источников</h3>
            <button
              className={`btn ${settings.monitoring.enabled ? 'btn-danger' : 'btn-success'}`}
              onClick={() => updateMonitoringEnabled(!settings.monitoring.enabled)}
              disabled={loading}
            >
              {settings.monitoring.enabled ? 'Отключить' : 'Включить'}
            </button>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Статус: <span className={settings.monitoring.enabled ? 'text-green-600' : 'text-red-600'}>
              {settings.monitoring.enabled ? 'Включен' : 'Отключен'}
            </span></div>
            <div>Задержка запуска: {settings.monitoring.delayMs}мс</div>
            <div>Расписание: {settings.monitoring.cronExpression}</div>
          </div>
        </div>
      </div>

      {/* Настройки приложения */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Настройки приложения</h2>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div>Порт: {settings.app.port}</div>
          <div>Окружение: {settings.app.nodeEnv}</div>
        </div>
      </div>

      {/* Отладочная информация */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Отладочная информация</h3>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>
    </div>
  );
}