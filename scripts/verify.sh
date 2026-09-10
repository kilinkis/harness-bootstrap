#!/usr/bin/env bash
set -euo pipefail

phase="${1:-local}"
if [[ $# -gt 1 || ( "$phase" != "local" && "$phase" != "ci" ) ]]; then
  echo "Usage: ./scripts/verify.sh [local|ci]" >&2
  exit 2
fi
HARNESS_DELIVERY_PHASE="$phase" pnpm run verify
