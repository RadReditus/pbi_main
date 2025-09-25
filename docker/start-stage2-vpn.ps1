# Скрипт для запуска VPN соединения
# Этап 2: VPN подключение

Write-Host "=== ЭТАП 2: Запуск VPN соединения ===" -ForegroundColor Green
Write-Host "Запускаем OpenVPN клиент..." -ForegroundColor Yellow

# Проверяем, что базовая инфраструктура запущена
$postgresStatus = docker-compose ps postgres
if ($postgresStatus -notmatch "Up") {
    Write-Host "ОШИБКА: PostgreSQL не запущен! Сначала запустите start-stage1-infrastructure.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "Запускаем VPN контейнер..." -ForegroundColor Yellow
docker-compose up -d vpn

Write-Host "Ожидаем установки VPN соединения..." -ForegroundColor Yellow
Write-Host "Это может занять 30-60 секунд..." -ForegroundColor Yellow

$timeout = 120 # 2 минуты
$elapsed = 0
do {
    $status = docker-compose ps vpn
    if ($status -match "healthy") {
        Write-Host "VPN соединение установлено!" -ForegroundColor Green
        break
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "ОШИБКА: VPN не удалось установить соединение за $timeout секунд" -ForegroundColor Red
        Write-Host "Проверьте логи: docker-compose logs vpn" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Ожидание VPN... ($elapsed/$timeout сек)" -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $elapsed += 5
} while ($true)

Write-Host "=== ЭТАП 2 ЗАВЕРШЕН ===" -ForegroundColor Green
Write-Host "Статус сервисов:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`nСледующий этап: запустите start-stage3-api.ps1" -ForegroundColor Magenta
