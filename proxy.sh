#!/usr/bin/env bash
#
# proxy.sh — administra el proxy OAuth de Decap CMS (ManáPets)
#
# Uso:
#   ./proxy.sh status     estado del servicio
#   ./proxy.sh start      lo levanta (systemd si hay root, si no nohup)
#   ./proxy.sh stop       lo detiene
#   ./proxy.sh restart    reinicia
#   ./proxy.sh logs       sigue los logs (Ctrl+C para cortar)
#   ./proxy.sh check      prueba el login contra el proxy (local)
#   ./proxy.sh help       esta ayuda
#
# Variables de entorno:
#   PORT=8082   puerto local del proxy
#
set -euo pipefail

SERVICE="decap-proxy"
PORT="${PORT:-8082}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROXY_DIR="$APP_DIR/proxy"
PID_FILE="/tmp/decap-proxy.pid"
LOG_FILE="/tmp/decap-proxy.log"

export PATH="/usr/local/bin:$PATH"

log()  { printf '\033[1;32m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

need_node() {
  command -v node >/dev/null 2>&1 || die "Node no está instalado. Hace falta Node 22+ en el PATH."
}

need_env() {
  [ -f "$PROXY_DIR/.env" ] || die "Falta $PROXY_DIR/.env. Copiá proxy/.env.example y completá los valores."
  grep -q "GITHUB_CLIENT_SECRET=PEGÁ_AQUÍ" "$PROXY_DIR/.env" 2>/dev/null && \
    die "El GITHUB_CLIENT_SECRET de $PROXY_DIR/.env sigue siendo el de ejemplo. Completalo."
  return 0
}

has_systemd_unit() {
  command -v systemctl >/dev/null 2>&1 || return 1
  systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE}.service" || return 1
  return 0
}

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

port_open() {
  command -v ss >/dev/null 2>&1 || return 1
  local out
  out="$(ss -ltn 2>/dev/null || true)"
  grep -q ":$PORT " <<<"$out"
}

cmd_start() {
  need_node
  need_env

  if has_systemd_unit; then
    log "Levantando vía systemd (${SERVICE}.service)"
    systemctl start "$SERVICE"
    sleep 2
    systemctl --no-pager --lines=0 status "$SERVICE" | head -6
    return
  fi

  if is_running; then
    warn "Ya está corriendo (PID $(cat "$PID_FILE"))."
    return
  fi
  port_open && die "El puerto $PORT ya está ocupado. Revisá con: $0 status"

  log "Levantando en segundo plano (nohup), log en $LOG_FILE"
  cd "$PROXY_DIR"
  nohup node server.mjs >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2
  is_running && log "Activo en http://127.0.0.1:$PORT" || die "No arrancó. Revisá $LOG_FILE"
}

cmd_stop() {
  if has_systemd_unit; then
    systemctl stop "$SERVICE" && log "Detenido vía systemd"
    return
  fi
  if is_running; then
    local pid; pid="$(cat "$PID_FILE")"
    log "Deteniendo PID $pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  else
    warn "No hay servicio corriendo."
  fi
}

cmd_restart() { cmd_stop; cmd_start; }

cmd_status() {
  if has_systemd_unit; then
    systemctl --no-pager -n 5 status "$SERVICE" || true
  fi
  if is_running; then
    log "nohup activo (PID $(cat "$PID_FILE")) — log: $LOG_FILE"
  elif ! has_systemd_unit; then
    warn "Sin servicio systemd."
  fi
  port_open && log "Puerto $PORT escuchando" || warn "Puerto $PORT cerrado"

  if command -v curl >/dev/null 2>&1; then
    printf '  health: '
    curl -s -m 5 "http://127.0.0.1:$PORT/health" || echo "sin respuesta"
    echo
  fi
}

cmd_logs() {
  if has_systemd_unit; then
    journalctl -u "$SERVICE" -f 2>/dev/null && return
    warn "No se pudo leer el journal (probá como root); reviso $LOG_FILE"
  fi
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    die "No hay logs disponibles."
  fi
}

cmd_check() {
  need_node
  need_env
  log "Probando /health en http://127.0.0.1:$PORT/health"
  curl -s -m 8 "http://127.0.0.1:$PORT/health" | head -c 400
  echo
  local origin
  origin="$(grep -E '^ALLOWED_ORIGINS=' "$PROXY_DIR/.env" | head -1 | cut -d= -f2- | cut -d, -f1 | tr -d ' ')"
  log "Probando /auth con site_id=$origin"
  curl -s -m 8 -o /dev/null -w '  HTTP %{http_code} (redirección a GitHub: %{redirect_url})\n' \
    "http://127.0.0.1:$PORT/auth?provider=github&site_id=${origin}&scope=repo"
}

cmd_help() {
  sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'
}

case "${1:-status}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  check)   cmd_check ;;
  help|-h|--help) cmd_help ;;
  *) die "Comando desconocido: $1 (probá: $0 help)" ;;
esac
