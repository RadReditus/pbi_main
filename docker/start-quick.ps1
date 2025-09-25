# Скрипт для быстрого запуска (если система мощная)
# Запускает все сервисы одновременно

Write-Host "=== БЫСТРЫЙ ЗАПУСК PBI EXCHANGE ===" -ForegroundColor Magenta
Write-Host "Запускаем все сервисы одновременно..." -ForegroundColor Yellow

# Останавливаем существующие контейнеры
Write-Host "Останавливаем существующие контейнеры..." -ForegroundColor Yellow
docker-compose down

# Запускаем все сервисы
Write-Host "Запускаем все сервисы..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Ожидаем готовности всех сервисов..." -ForegroundColor Yellow
Write-Host "Это может занять 2-3 минуты..." -ForegroundColor Yellow

# Ждем готовности всех сервисов
$timeout = 300 # 5 минут
$elapsed = 0

do {
    $allUp = $true
    $services = @("postgres", "redis", "mongo", "vpn", "api", "frontend")
    
    foreach ($service in $services) {
        $status = docker-compose ps $service
        if ($status -notmatch "Up") {
            $allUp = $false
            break
        }
    }
    
    if ($allUp) {
        Write-Host "Все сервисы запущены!" -ForegroundColor Green
        break
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "ОШИБКА: Не все сервисы запустились за $timeout секунд" -ForegroundColor Red
        Write-Host "Проверьте статус: docker-compose ps" -ForegroundColor Yellow
        Write-Host "Проверьте логи: docker-compose logs" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Ожидание сервисов... ($elapsed/$timeout сек)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    $elapsed += 10
} while ($true)

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
