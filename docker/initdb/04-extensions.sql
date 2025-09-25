-- 04-extensions.sql
-- Установим полезные расширения во всех БД
\connect users_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect onec_filtered_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\connect onec_tagged_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
