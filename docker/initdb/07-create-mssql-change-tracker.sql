-- 07-create-mssql-change-tracker.sql
-- Создание таблицы для отслеживания изменений в MSSQL данных

CREATE TABLE IF NOT EXISTS mssql_change_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    database_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    last_processed_record_id BIGINT DEFAULT 0,
    last_processed_timestamp TIMESTAMPTZ,
    last_processed_hash TEXT,
    total_records_count BIGINT DEFAULT 0,
    processed_records_count BIGINT DEFAULT 0,
    primary_key_column VARCHAR(50) DEFAULT 'id',
    timestamp_column VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Уникальный индекс для предотвращения дублирования трекеров
    UNIQUE(database_name, table_name)
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_mssql_change_tracker_database_name ON mssql_change_tracker(database_name);
CREATE INDEX IF NOT EXISTS idx_mssql_change_tracker_table_name ON mssql_change_tracker(table_name);
CREATE INDEX IF NOT EXISTS idx_mssql_change_tracker_is_active ON mssql_change_tracker(is_active);
CREATE INDEX IF NOT EXISTS idx_mssql_change_tracker_last_processed ON mssql_change_tracker(last_processed_record_id);

-- Комментарии к таблице
COMMENT ON TABLE mssql_change_tracker IS 'Отслеживание изменений в MSSQL данных для инкрементальной синхронизации';
COMMENT ON COLUMN mssql_change_tracker.database_name IS 'Имя базы данных MSSQL';
COMMENT ON COLUMN mssql_change_tracker.table_name IS 'Имя таблицы в MSSQL';
COMMENT ON COLUMN mssql_change_tracker.last_processed_record_id IS 'ID последней обработанной записи';
COMMENT ON COLUMN mssql_change_tracker.last_processed_timestamp IS 'Время последней обработки';
COMMENT ON COLUMN mssql_change_tracker.last_processed_hash IS 'Хеш последней обработанной записи';
COMMENT ON COLUMN mssql_change_tracker.total_records_count IS 'Общее количество записей в таблице';
COMMENT ON COLUMN mssql_change_tracker.processed_records_count IS 'Количество обработанных записей';
COMMENT ON COLUMN mssql_change_tracker.primary_key_column IS 'Название колонки первичного ключа';
COMMENT ON COLUMN mssql_change_tracker.timestamp_column IS 'Название колонки времени (если есть)';
COMMENT ON COLUMN mssql_change_tracker.is_active IS 'Активен ли трекер';
