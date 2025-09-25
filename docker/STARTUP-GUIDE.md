# 🚀 Руководство по запуску PBI Exchange

## 📋 Обзор

Система PBI Exchange состоит из 6 основных сервисов:
- **PostgreSQL** - основная база данных
- **Redis** - кэш и очереди
- **MongoDB** - логи и метрики
- **OpenVPN** - VPN соединение с 1C
- **NestJS API** - backend сервер
- **React Frontend** - веб-интерфейс

## 🎯 Способы запуска

### 1. 🐌 Поэтапный запуск (РЕКОМЕНДУЕТСЯ)

**Для слабых систем или первого запуска:**

```powershell
# Windows PowerShell
.\start-all-stages.ps1

# Linux/Mac
./start-all-stages.sh
```

**Этапы:**
1. **Инфраструктура** (30 сек) - PostgreSQL, Redis, MongoDB
2. **VPN** (60 сек) - OpenVPN соединение
3. **API** (60 сек) - NestJS сервер
4. **Frontend** (30 сек) - React приложение

### 2. ⚡ Быстрый запуск

**Для мощных систем:**

```powershell
# Windows PowerShell
.\start-quick.ps1

# Linux/Mac
./start-quick.sh
```

### 3. 🔧 Режим разработки

**Без VPN для локальной разработки:**

```powershell
# Windows PowerShell
.\start-dev.ps1
```

### 4. 🛑 Остановка

```powershell
# Windows PowerShell
.\stop-all.ps1

# Linux/Mac
./stop-all.sh
```

## 📊 Мониторинг

### Проверка статуса
```bash
# Статус всех контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи сервиса
docker-compose logs api
docker-compose logs vpn
```

### Доступные сервисы
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3001
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379
- **MongoDB**: localhost:27017

## 🔧 Устранение проблем

### VPN не подключается
```bash
# Проверьте логи
docker-compose logs vpn

# Перезапустите VPN
docker-compose restart vpn

# Проверьте конфигурацию VPN
ls docker/vpn/
```

### API не запускается
```bash
# Проверьте логи
docker-compose logs api

# Проверьте зависимости
docker-compose ps postgres redis mongo

# Перезапустите API
docker-compose restart api
```

### Frontend недоступен
```bash
# Проверьте логи
docker-compose logs frontend

# Проверьте API
docker-compose ps api

# Перезапустите Frontend
docker-compose restart frontend
```

### Полная перезагрузка
```bash
# Остановить все
.\stop-all.ps1

# Очистить данные (ОСТОРОЖНО!)
docker-compose down -v

# Запустить заново
.\start-all-stages.ps1
```

## ⚙️ Конфигурация

### Переменные окружения
Создайте файл `.env` в корне проекта:

```env
# База данных
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MongoDB
MONGO_HOST=mongo
MONGO_PORT=27017

# API
API_KEY=0123456789abcdef0123456789abcdef
NODE_ENV=production

# Мониторинг
MONITORING_ENABLE=true
MONITORING_DELAY_MS=60000
```

### VPN конфигурация
Поместите файл `client.ovpn` в папку `docker/vpn/`

## 📈 Производительность

### Рекомендации по ресурсам

**Минимальные требования:**
- RAM: 4GB
- CPU: 2 ядра
- Диск: 10GB

**Рекомендуемые:**
- RAM: 8GB
- CPU: 4 ядра
- Диск: 20GB

### Оптимизация

**Для слабых систем:**
- Используйте поэтапный запуск
- Отключите неиспользуемые сервисы
- Увеличьте задержки между этапами

**Для мощных систем:**
- Используйте быстрый запуск
- Увеличьте лимиты Docker
- Используйте SSD диски

## 🔒 Безопасность

### VPN
- VPN соединение обязательно для работы с 1C
- Конфигурация VPN хранится в `docker/vpn/`
- Пароли VPN в переменных окружения

### API
- API ключ в переменной `API_KEY`
- JWT токены для аутентификации
- CORS настроен для localhost

### База данных
- Пароли в переменных окружения
- Доступ только через Docker сеть
- Регулярные бэкапы

## 📝 Логи

### Расположение логов
```bash
# Логи контейнеров
docker-compose logs

# Логи приложения
docker-compose logs api

# Логи базы данных
docker-compose logs postgres
```

### Ротация логов
```bash
# Очистить старые логи
docker system prune -f

# Очистить все неиспользуемые данные
docker system prune -a -f
```

## 🆘 Поддержка

### Полезные команды
```bash
# Перезапуск сервиса
docker-compose restart <service_name>

# Просмотр логов в реальном времени
docker-compose logs -f <service_name>

# Вход в контейнер
docker-compose exec <service_name> bash

# Проверка здоровья
docker-compose ps
```

### Контакты
- Документация: `README.md`
- Мониторинг: `MONITORING.md`
- Конфигурация: `CONFIG.md`
