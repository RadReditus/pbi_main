# Скрипт для запуска в режиме разработки
# Запускает только необходимые сервисы без VPN

Write-Host "=== ЗАПУСК В РЕЖИМЕ РАЗРАБОТКИ ===" -ForegroundColor Magenta
Write-Host "Запускаем только базовые сервисы без VPN..." -ForegroundColor Yellow

# Останавливаем все контейнеры
Write-Host "Останавливаем существующие контейнеры..." -ForegroundColor Yellow
docker-compose down

# Запускаем только базовые сервисы
Write-Host "Запускаем PostgreSQL, Redis, MongoDB..." -ForegroundColor Yellow
docker-compose up -d postgres redis mongo

Write-Host "Ожидаем готовности PostgreSQL..." -ForegroundColor Yellow
do {
    $status = docker-compose ps postgres
    if ($status -match "healthy") {
        Write-Host "PostgreSQL готов!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
} while ($true)

Write-Host "Запускаем API без VPN..." -ForegroundColor Yellow
# Запускаем API с переменной окружения для отключения VPN
$env:SKIP_VPN = "true"
docker-compose up -d api

Write-Host "Запускаем Frontend..." -ForegroundColor Yellow
docker-compose up -d frontend

Write-Host "Ожидаем готовности всех сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "=== РЕЖИМ РАЗРАБОТКИ ЗАПУЩЕН ===" -ForegroundColor Green
Write-Host "Статус сервисов:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`nДоступные сервисы:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "- API: http://localhost:3001" -ForegroundColor White
Write-Host "- PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host "- MongoDB: localhost:27017" -ForegroundColor White

Write-Host "`nПримечание: VPN отключен для разработки" -ForegroundColor Yellow
Write-Host "Для полного запуска с VPN используйте: .\start-all-stages.ps1" -ForegroundColor Yellow
