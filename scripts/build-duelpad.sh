#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PICO_SDK_PATH:?Set PICO_SDK_PATH to Pico SDK 2.1.1}"
cmake -S . -B build-duelpad -DCMAKE_BUILD_TYPE=Release -DGP2040_BOARDCONFIG=DuelPadZen
cmake --build build-duelpad --parallel "${BUILD_JOBS:-4}"
