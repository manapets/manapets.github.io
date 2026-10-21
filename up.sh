#!/usr/bin/env bash
#
# up.sh — sube la tienda ManáPets a GitHub y prepara GitHub Pages
#
# Uso:
#   ./up.sh          sube los cambios a la rama main
#   ./up.sh build    solo compila el sitio en dist/
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="https://github.com/manapets/manapets.github.io.git"

log()  { printf '\033[1;32m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }

cd "$APP_DIR"

case "${1:-up}" in
  build)
    log "Compilando sitio estático (npm run build)"
    npm run build
    log "Listo: dist/ generado"
    ;;

  up|"")
    log "Inicializando git (si no existe)"
    if [ ! -d .git ]; then
      git init
      git branch -M main
    fi

    log "Conectando con GitHub"
    if ! git remote get-url origin >/dev/null 2>&1; then
      git remote add origin "$REPO_URL"
    fi

    log "Subiendo cambios a GitHub"
    git add .
    git commit -m "Tienda ManáPets con panel de admin Decap CMS" || true
    git push -u origin main

    log "Listo. Ahora en GitHub:"
    log "  1. Settings → Pages → Source: GitHub Actions"
    log "  2. Esperá a que el workflow termine (pestaña Actions)"
    log "  3. Tu sitio: https://manapets.github.io/"
    ;;

  *)
    echo "Uso: $0 [up|build]"
    exit 1
    ;;
esac