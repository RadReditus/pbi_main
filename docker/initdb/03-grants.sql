-- 03-grants.sql
-- Гранты на три БД: users_db, onec_filtered_db, onec_tagged_db

-- CONNECT можно выдать из postgres
GRANT CONNECT ON DATABASE users_db          TO app_user, app_assistant, app_admin;
GRANT CONNECT ON DATABASE onec_filtered_db  TO app_user, app_assistant, app_admin;
GRANT CONNECT ON DATABASE onec_tagged_db    TO app_user, app_assistant, app_admin;

\connect users_db

GRANT USAGE ON SCHEMA public TO app_user, app_assistant, app_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_assistant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO app_assistant;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;

\connect onec_filtered_db

GRANT USAGE ON SCHEMA public TO app_user, app_assistant, app_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_assistant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO app_assistant;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;

\connect onec_tagged_db

GRANT USAGE ON SCHEMA public TO app_user, app_assistant, app_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_user;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_assistant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO app_assistant;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;
