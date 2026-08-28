#!/usr/bin/env bash
set -euo pipefail

pnpm run check:harness-state
pnpm run verify
