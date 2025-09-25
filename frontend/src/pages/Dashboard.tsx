export default function Dashboard(){
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <div className="h2 mb-2">Сценарий по ТЗ</div>
        <ol className="list-decimal ml-6 space-y-1 text-sm">
          <li>Settings: указать baseUrl и x-api-key (если не по умолчанию).</li>
          <li>Login → токен.</li>
          <li>Users: создать пользователя/ассистента.</li>
          <li>Tags: создать IGNORE/MASK правила.</li>
          <li>Records: Ingest → Promote → просмотреть filtered/tagged.</li>
          <li>Export: получить JSON/SQL.</li>
          <li>OData: тест к 1С, создать источник, fetch.</li>
          <li>Logs: записать лог, просмотреть.</li>
        </ol>
      </div>
      <div className="card"><div className="h2 mb-2">Подсказки</div>
        <ul className="list-disc ml-6 text-sm space-y-1">
          <li>JWT хранится в localStorage.</li>
          <li>Роли берутся из токена; UI скрывает недоступные разделы.</li>
          <li>Ключ API используется на эндпоинтах с x-api-key.</li>
        </ul>
      </div>
    </div>
  );
}
