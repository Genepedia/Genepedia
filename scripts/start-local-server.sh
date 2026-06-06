#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"
exec "${ROOT_DIR}/.tools/frankenphp/frankenphp" php-server --listen "${GENEPEDIA_LISTEN:-127.0.0.1:8000}" "$@"