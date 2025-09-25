#!/bin/bash
# Скрипт для запуска базовой инфраструктуры (PostgreSQL, Redis, MongoDB)
# Этап 1: База данных и кэш

echo "=== ЭТАП 1: Запуск базовой инфраструктуры ==="
echo "Запускаем PostgreSQL, Redis, MongoDB..."

# Останавливаем все контейнеры если они запущены
echo "Останавливаем существующие контейнеры..."
docker-compose down

# Запускаем только базовую инфраструктуру
echo "Запускаем PostgreSQL..."
docker-compose up -d postgres

echo "Ожидаем готовности PostgreSQL..."
while true; do
    if docker-compose ps postgres | grep -q "healthy"; then
        echo "PostgreSQL готов!"
        break
    fi
    sleep 2
done

echo "Запускаем Redis..."
docker-compose up -d redis

echo "Запускаем MongoDB..."
docker-compose up -d mongo

echo "Ожидаем готовности всех сервисов..."
sleep 5

echo "=== ЭТАП 1 ЗАВЕРШЕН ==="
echo "Статус сервисов:"
docker-compose ps

echo ""
echo "Следующий этап: запустите ./start-stage2-vpn.sh"
