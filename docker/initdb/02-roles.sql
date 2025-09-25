-- 02-roles.sql
-- Создание ролей (запускается один раз при инициализации тома PG)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin      LOGIN PASSWORD 'admin_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_assistant') THEN
    CREATE ROLE app_assistant  LOGIN PASSWORD 'assistant_assistant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user       LOGIN PASSWORD 'user_user';
  END IF;
END$$;
