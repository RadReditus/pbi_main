# 🚀 Инструкции по запуску PBI Exchange

## Обзор

Система PBI Exchange состоит из нескольких сервисов, которые можно запускать поэтапно для снижения нагрузки на систему или все сразу для быстрого запуска.

## Архитектура сервисов

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│     API     │───▶│     VPN     │
│  (React)    │    │  (NestJS)   │    │ (OpenVPN)   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                    ┌──────┼──────┐
                    │      │      │
            ┌───────▼─┐ ┌──▼──┐ ┌─▼────────┐
            │PostgreSQL│ │Redis│ │ MongoDB  │
            │         │ │     │ │          │
            └─────────┘ └─────┘ └──────────┘
```

## Способы запуска

### 1. 🐌 Поэтапный запуск (рекомендуется для слабых систем)

Запускает сервисы по очереди с паузами между этапами:

```powershell
# Полный поэтапный запуск
.\start-all-stages.ps1

# Или запуск по отдельным этапам:
.\start-stage1-infrastructure.ps1  # PostgreSQL, Redis, MongoDB
.\start-stage2-vpn.ps1            # OpenVPN соединение
.\start-stage3-api.ps1            # NestJS API
.\start-stage4-frontend.ps1       # React Frontend
```

**Этапы:**
1. **Инфраструктура** - PostgreSQL, Redis, MongoDB
2. **VPN** - OpenVPN соединение (30-60 сек)
3. **API** - NestJS сервер (30-60 сек)
4. **Frontend** - React приложение (30-60 сек)

### 2. ⚡ Быстрый запуск (для мощных систем)

Запускает все сервисы одновременно:

```powershell
.\start-quick.ps1
```

### 3. 🛑 Остановка

```powershell
.\stop-all.ps1
```

## Проверка статуса

```powershell
# Статус всех контейнеров
docker-compose ps

# Логи конкретного сервиса
docker-compose logs api
docker-compose logs vpn
docker-compose logs frontend

# Логи всех сервисов
docker-compose logs
```

## Доступные сервисы

После успешного запуска доступны:

- **Frontend**: http://localhost:8080
- **API**: http://localhost:3001
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379
- **MongoDB**: localhost:27017

## Устранение проблем

### VPN не подключается
```powershell
# Проверьте логи VPN
docker-compose logs vpn

# Перезапустите только VPN
docker-compose restart vpn
```

### API не запускается
```powershell
# Проверьте логи API
docker-compose logs api

# Проверьте, что VPN готов
docker-compose ps vpn
```

### Frontend не доступен
```powershell
# Проверьте логи Frontend
docker-compose logs frontend

# Проверьте, что API готов
docker-compose ps api
```

### Полная перезагрузка
```powershell
# Остановить все
.\stop-all.ps1

# Запустить заново
.\start-all-stages.ps1
```

## Рекомендации

- **Для разработки**: используйте поэтапный запуск
- **Для продакшена**: используйте быстрый запуск
- **При проблемах**: проверяйте логи и перезапускайте проблемные сервисы
- **Для экономии ресурсов**: останавливайте неиспользуемые сервисы

## Мониторинг ресурсов

```powershell
# Использование ресурсов контейнерами
docker stats

# Использование диска
docker system df
```
