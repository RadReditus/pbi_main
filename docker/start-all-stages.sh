#!/bin/bash
# Скрипт для полного поэтапного запуска всех сервисов
# Запускает все этапы последовательно с паузами

echo "=== ПОЭТАПНЫЙ ЗАПУСК PBI EXCHANGE ==="
echo "Этот скрипт запустит все сервисы поэтапно для снижения нагрузки на систему"

# Этап 1: Базовая инфраструктура
echo ""
echo "Запуск этапа 1..."
./start-stage1-infrastructure.sh

if [ $? -ne 0 ]; then
    echo "ОШИБКА на этапе 1!"
    exit 1
fi

echo ""
echo "Пауза 10 секунд перед следующим этапом..."
sleep 10

# Этап 2: VPN
echo ""
echo "Запуск этапа 2..."
./start-stage2-vpn.sh

if [ $? -ne 0 ]; then
    echo "ОШИБКА на этапе 2!"
    exit 1
fi

echo ""
echo "Пауза 15 секунд перед следующим этапом..."
sleep 15

# Этап 3: API
echo ""
echo "Запуск этапа 3..."
./start-stage3-api.sh

if [ $? -ne 0 ]; then
    echo "ОШИБКА на этапе 3!"
    exit 1
fi

echo ""
echo "Пауза 10 секунд перед следующим этапом..."
sleep 10

# Этап 4: Frontend
echo ""
echo "Запуск этапа 4..."
./start-stage4-frontend.sh

if [ $? -ne 0 ]; then
    echo "ОШИБКА на этапе 4!"
    exit 1
fi

echo ""
echo "=== ВСЕ ЭТАПЫ ЗАВЕРШЕНЫ УСПЕШНО! ==="
echo "Система готова к работе!"
