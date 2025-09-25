# PBI Exchange (fixed)

## Быстрый старт (Docker, dev)
```bash
cd docker
docker compose down -v  # если поднималось ранее
docker compose up -d --build
```

- API: http://localhost:3000/health → 200
- Frontend: http://localhost:8080

> Init-скрипты создадут БД `users_db`, `onec_filtered_db`, `onec_tagged_db`, роли и гранты.
Файлы лежат в `docker/initdb/*.sql` и выполняются автоматически при **первом** старте чистого тома.

## .env пример
```
NODE_ENV=development
PORT=3000

JWT_SECRET=change_me_long_random
API_KEY_PBI=0123456789abcdef0123456789abcdef
ODATA_PW_SECRET=32bytes_hex_key_for_aes_256

PG_HOST=postgres
PG_PORT=5432
PG_USER=app
PG_PASSWORD=app
PG_DB_USERS=users_db
PG_DB_FILTERED=onec_filtered_db
PG_DB_TAGGED=onec_tagged_db

REDIS_HOST=redis
REDIS_PORT=6379

MONGO_URI=mongodb://mongo:27017/pbi_exchange

FILE_LOGGING=true
LOG_FILE_PATH=/app/logs/app.log

# Source1c module
SOURCE1C_ENABLE=false
SOURCE1C_DELAY_MS=20000
SOURCE1C_LINKS=[
  {"url":"http://rts-vsrv04.rts.kz/Plan_B_BUH/odata/standard.odata/AccumulationRegister_%D0%A1%D0%9E%D0%A0%D0%B0%D1%81%D1%87%D0%B5%D1%82%D1%8B%D0%A1%D0%A4%D0%BE%D0%BD%D0%B4%D0%B0%D0%BC%D0%B8/?$format=json","name":"soraschetysfondami"}
]
SOURCE1C_USERNAME=Power_BI
SOURCE1C_PASSWORD=Y#632754265740oq
SOURCE1C_TIMEOUT_MS=120000
SOURCE1C_PG_HOST=postgres
SOURCE1C_PG_PORT=5432
SOURCE1C_PG_USER=app
SOURCE1C_PG_PASSWORD=app
SOURCE1C_PG_DB=source_1c
```

## Локальная разработка (без Docker)
```bash
# Backend
npm i
npm run build
npm run start:dev

# Frontend
cd frontend
npm i
npm run dev
```
Поменяй `VITE_API_URL` и `VITE_API_KEY` в `frontend/.env` (или через `--host`) под локальный API.

## Тесты
```bash
# unit + e2e (Jest)
npm run test
npm run test:e2e

# дымовой http (REST Client / VS Code)
cat test/smoke/health.http

# производительность (k6)
k6 run test/perf/k6-get-records.js  # передай API_KEY через env при необходимости
```
- e2e: проверяет `/health` на 200.
- unit: проверка `TagsService.decide()` на правило IGNORE.

## Что проверить руками (по ТЗ)
1. Логин (страница **Login**) → **/auth/me**.
2. Создать пользователя/ассистента (страница **Users**).
3. Создать теги IGNORE/MASK (страница **Tags**).
4. Ingest → Promote (страница **Records**) и просмотреть **filtered/tagged**.
5. Экспорт **JSON/SQL** (страница **Export**) — SQL включает `CREATE TABLE IF NOT EXISTS` и `INSERT`.
6. OData: **без дефолтных учёток** — вводи руками для теста, источники на прод добавляй через бекенд.
