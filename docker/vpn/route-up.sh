#!/bin/sh
set -eu
LOG=/tmp/route-up.log

{
  printf '[%s] route-up start\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

  # если хук вызвали слишком рано вручную — тихо выходим
  ip link show tun0 >/dev/null 2>&1 || { echo "tun0 not up yet"; exit 0; }

  ip -br a show tun0 || true

  # /32 маршрут к 172.22.0.40 и 172.22.0.42 через VPN во всех ключевых таблицах
  for T in main 199 200; do
    ip route replace table "$T" 172.22.0.40/32 via 192.168.101.1 dev tun0 2>/dev/null || true
    ip route replace table "$T" 172.22.0.42/32 via 192.168.101.1 dev tun0 2>/dev/null || true
  done

  # Policy routing: для dst 172.22.0.40 и 172.22.0.42 использовать table main
  ip -4 rule del pref 90 2>/dev/null || true
  ip -4 rule add pref 90 to 172.22.0.40/32 lookup main
  ip -4 rule add pref 90 to 172.22.0.42/32 lookup main

  # очистка кэша маршрутов через netlink (может быть read-only — не критично)
  ip route flush cache 2>/dev/null || true

  echo 'ip rule:'; ip rule show
  for T in main 199 200; do
    echo "table $T:"; ip route show table "$T" | grep 172.22.0.40 || true
  done
  printf '[%s] route-up end\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} >> "$LOG" 2>&1
