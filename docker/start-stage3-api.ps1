# Скрипт для запуска API сервера
# Этап 3: Backend API

Write-Host "=== ЭТАП 3: Запуск API сервера ===" -ForegroundColor Green
Write-Host "Запускаем NestJS API..." -ForegroundColor Yellow

# Проверяем, что VPN готов
$vpnStatus = docker-compose ps vpn
if ($vpnStatus -notmatch "healthy") {
    Write-Host "ОШИБКА: VPN не готов! Сначала запустите start-stage2-vpn.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "Запускаем API контейнер..." -ForegroundColor Yellow
docker-compose up -d api

Write-Host "Ожидаем запуска API сервера..." -ForegroundColor Yellow
Write-Host "Это может занять 30-60 секунд..." -ForegroundColor Yellow

$timeout = 120 # 2 минуты
$elapsed = 0
do {
    $status = docker-compose ps api
    if ($status -match "Up") {
        Write-Host "API сервер запущен!" -ForegroundColor Green
        break
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "ОШИБКА: API не удалось запустить за $timeout секунд" -ForegroundColor Red
        Write-Host "Проверьте логи: docker-compose logs api" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Ожидание API... ($elapsed/$timeout сек)" -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $elapsed += 5
} while ($true)

Write-Host "=== ЭТАП 3 ЗАВЕРШЕН ===" -ForegroundColor Green
Write-Host "Статус сервисов:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`nСледующий этап: запустите start-stage4-frontend.ps1" -ForegroundColor Magenta
