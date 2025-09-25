# Скрипт для запуска базовой инфраструктуры (PostgreSQL, Redis, MongoDB)
# Этап 1: База данных и кэш

Write-Host "=== ЭТАП 1: Запуск базовой инфраструктуры ===" -ForegroundColor Green
Write-Host "Запускаем PostgreSQL, Redis, MongoDB..." -ForegroundColor Yellow

# Останавливаем все контейнеры если они запущены
Write-Host "Останавливаем существующие контейнеры..." -ForegroundColor Yellow
docker-compose down

# Запускаем только базовую инфраструктуру
Write-Host "Запускаем PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres

Write-Host "Ожидаем готовности PostgreSQL..." -ForegroundColor Yellow
do {
    $status = docker-compose ps postgres
    if ($status -match "healthy") {
        Write-Host "PostgreSQL готов!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
} while ($true)

Write-Host "Запускаем Redis..." -ForegroundColor Yellow
docker-compose up -d redis

Write-Host "Запускаем MongoDB..." -ForegroundColor Yellow
docker-compose up -d mongo

Write-Host "Ожидаем готовности всех сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "=== ЭТАП 1 ЗАВЕРШЕН ===" -ForegroundColor Green
Write-Host "Статус сервисов:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`nСледующий этап: запустите start-stage2-vpn.ps1" -ForegroundColor Magenta
