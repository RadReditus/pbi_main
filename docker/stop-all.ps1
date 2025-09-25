# Скрипт для остановки всех сервисов

Write-Host "=== ОСТАНОВКА PBI EXCHANGE ===" -ForegroundColor Magenta

Write-Host "Останавливаем все контейнеры..." -ForegroundColor Yellow
docker-compose down

Write-Host "Проверяем статус..." -ForegroundColor Yellow
$status = docker-compose ps
if ($status -match "Up") {
    Write-Host "Некоторые контейнеры все еще запущены. Принудительная остановка..." -ForegroundColor Yellow
    docker-compose down --remove-orphans
}

Write-Host "Очищаем неиспользуемые образы (опционально)..." -ForegroundColor Yellow
$cleanup = Read-Host "Удалить неиспользуемые Docker образы? (y/N)"
if ($cleanup -eq "y" -or $cleanup -eq "Y") {
    docker image prune -f
    Write-Host "Неиспользуемые образы удалены" -ForegroundColor Green
}

Write-Host "=== ВСЕ СЕРВИСЫ ОСТАНОВЛЕНЫ ===" -ForegroundColor Green
