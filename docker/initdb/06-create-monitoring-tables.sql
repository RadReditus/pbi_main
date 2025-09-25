-- 06-create-monitoring-tables.sql
-- Создание таблиц для мониторинга OData источников

-- Создаем таблицу счетчиков в базе users_db
CREATE TABLE IF NOT EXISTS table_counter (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    current_count INTEGER DEFAULT 0,
    last_synced_count INTEGER DEFAULT 0,
    needs_update BOOLEAN DEFAULT false,
    last_checked_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_table_counter_table_name ON table_counter(table_name);
CREATE INDEX IF NOT EXISTS idx_table_counter_base_url ON table_counter(base_url);
CREATE INDEX IF NOT EXISTS idx_table_counter_needs_update ON table_counter(needs_update);
CREATE INDEX IF NOT EXISTS idx_table_counter_last_checked ON table_counter(last_checked_at);

-- Создаем уникальный индекс для предотвращения дублирования
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_counter_unique ON table_counter(table_name, base_url);




