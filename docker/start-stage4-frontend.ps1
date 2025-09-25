# Скрипт для запуска Frontend
# Этап 4: Frontend приложение

Write-Host "=== ЭТАП 4: Запуск Frontend приложения ===" -ForegroundColor Green
Write-Host "Запускаем React Frontend..." -ForegroundColor Yellow

# Проверяем, что API готов
$apiStatus = docker-compose ps api
if ($apiStatus -notmatch "Up") {
    Write-Host "ОШИБКА: API не готов! Сначала запустите start-stage3-api.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "Запускаем Frontend контейнер..." -ForegroundColor Yellow
docker-compose up -d frontend

Write-Host "Ожидаем запуска Frontend..." -ForegroundColor Yellow
Write-Host "Это может занять 30-60 секунд..." -ForegroundColor Yellow

$timeout = 120 # 2 минуты
$elapsed = 0
do {
    $status = docker-compose ps frontend
    if ($status -match "Up") {
        Write-Host "Frontend запущен!" -ForegroundColor Green
        break
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "ОШИБКА: Frontend не удалось запустить за $timeout секунд" -ForegroundColor Red
        Write-Host "Проверьте логи: docker-compose logs frontend" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Ожидание Frontend... ($elapsed/$timeout сек)" -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $elapsed += 5
} while ($true)

Write-Host "=== ЭТАП 4 ЗАВЕРШЕН ===" -ForegroundColor Green
Write-Host "=== ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ! ===" -ForegroundColor Green

Write-Host "`nСтатус всех сервисов:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`nДоступные сервисы:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "- API: http://localhost:3001" -ForegroundColor White
Write-Host "- PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host "- MongoDB: localhost:27017" -ForegroundColor White

Write-Host "`nДля остановки всех сервисов: docker-compose down" -ForegroundColor Yellow
