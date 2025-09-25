# Скрипт для полного поэтапного запуска всех сервисов
# Запускает все этапы последовательно с паузами

Write-Host "=== ПОЭТАПНЫЙ ЗАПУСК PBI EXCHANGE ===" -ForegroundColor Magenta
Write-Host "Этот скрипт запустит все сервисы поэтапно для снижения нагрузки на систему" -ForegroundColor Yellow

# Этап 1: Базовая инфраструктура
Write-Host "`nЗапуск этапа 1..." -ForegroundColor Green
& "$PSScriptRoot\start-stage1-infrastructure.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА на этапе 1!" -ForegroundColor Red
    exit 1
}

Write-Host "`nПауза 10 секунд перед следующим этапом..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Этап 2: VPN
Write-Host "`nЗапуск этапа 2..." -ForegroundColor Green
& "$PSScriptRoot\start-stage2-vpn.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА на этапе 2!" -ForegroundColor Red
    exit 1
}

Write-Host "`nПауза 15 секунд перед следующим этапом..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Этап 3: API
Write-Host "`nЗапуск этапа 3..." -ForegroundColor Green
& "$PSScriptRoot\start-stage3-api.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА на этапе 3!" -ForegroundColor Red
    exit 1
}

Write-Host "`nПауза 10 секунд перед следующим этапом..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Этап 4: Frontend
Write-Host "`nЗапуск этапа 4..." -ForegroundColor Green
& "$PSScriptRoot\start-stage4-frontend.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА на этапе 4!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== ВСЕ ЭТАПЫ ЗАВЕРШЕНЫ УСПЕШНО! ===" -ForegroundColor Green
Write-Host "Система готова к работе!" -ForegroundColor Green
