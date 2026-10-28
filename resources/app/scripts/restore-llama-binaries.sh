#!/usr/bin/env bash
#
# Restore the real node-llama-cpp native addon for Linux x64.
#
# IMPORTANT: the files in `node-llama-cpp/bins/*.moved.txt` are NOT renamed
# binaries. They are ~40-byte upstream placeholders whose content is literally
# "Moved to package \"@node-llama-cpp/linux-x64\"". Renaming them (removing
# `.moved.txt` and the leading underscore) produces a broken 40-byte file that
# node-llama-cpp cannot load.
#
# Since node-llama-cpp 3.x the prebuilt addons live in separate optional
# packages. This script installs `@node-llama-cpp/linux-x64` next to
# `node-llama-cpp` so that `getLlama({ build: 'never' })` can find
# `bins/linux-x64/llama-addon.node`.
#
# Usage:
#   ./scripts/restore-llama-binaries.sh
#   NODE_LLAMA_CPP_VERSION=3.18.1 ./scripts/restore-llama-binaries.sh
#
set -euo pipefail

VERSION="${NODE_LLAMA_CPP_VERSION:-3.18.1}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGETS=("$APP_DIR/node_modules")

# Packaged installs keep native modules in app.asar.unpacked.
UNPACKED="$(cd "$APP_DIR/.." && pwd)/app.asar.unpacked/node_modules"
if [ -d "$UNPACKED" ]; then
    TARGETS+=("$UNPACKED")
fi

# The app directory may contain a partial copy of node-llama-cpp (only the
# directories that were unpacked from the asar). Sync the complete package so
# that its JS dependencies resolve from the app's node_modules.
COMPLETE_PKG="$UNPACKED/node-llama-cpp"
PARTIAL_PKG="$APP_DIR/node_modules/node-llama-cpp"
if [ -d "$COMPLETE_PKG" ] && [ -d "$PARTIAL_PKG" ] && [ ! -f "$PARTIAL_PKG/package.json" ]; then
    echo "Syncing complete node-llama-cpp package into $PARTIAL_PKG ..."
    cp -a "$COMPLETE_PKG/." "$PARTIAL_PKG/"
fi

for TARGET in "${TARGETS[@]}"; do
    DEST="$TARGET/@node-llama-cpp/linux-x64"

    if [ -f "$DEST/bins/linux-x64/llama-addon.node" ]; then
        echo "Already installed: $DEST"
        continue
    fi

    mkdir -p "$TARGET/@node-llama-cpp"
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT

    echo "Downloading @node-llama-cpp/linux-x64@$VERSION ..."
    curl -fsSL \
        "https://registry.npmjs.org/@node-llama-cpp/linux-x64/-/linux-x64-$VERSION.tgz" \
        | tar -xz -C "$TMP"

    rm -rf "$DEST"
    mv "$TMP/package" "$DEST"
    rm -rf "$TMP"
    trap - EXIT

    echo "Installed: $DEST"
done

echo
echo "Done. Restart Gemini Desktop and enable local text prediction."
