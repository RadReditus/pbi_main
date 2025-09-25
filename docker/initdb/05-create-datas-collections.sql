-- 05-create-datas-collections.sql
-- Создание таблицы для метаинформации о загруженных коллекциях OData

CREATE TABLE IF NOT EXISTS datas_collections (
  id BIGSERIAL PRIMARY KEY,
  base_url TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  last_check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  records_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(base_url, collection_name)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_datas_collections_base_url ON datas_collections(base_url);
CREATE INDEX IF NOT EXISTS idx_datas_collections_collection_name ON datas_collections(collection_name);
CREATE INDEX IF NOT EXISTS idx_datas_collections_last_check ON datas_collections(last_check_time);

-- Комментарии к таблице
COMMENT ON TABLE datas_collections IS 'Метаинформация о загруженных OData коллекциях';
COMMENT ON COLUMN datas_collections.base_url IS 'Базовый URL OData источника';
COMMENT ON COLUMN datas_collections.collection_name IS 'Название коллекции/таблицы';
COMMENT ON COLUMN datas_collections.last_check_time IS 'Время последней проверки/загрузки данных';
COMMENT ON COLUMN datas_collections.records_count IS 'Количество записей в коллекции';

