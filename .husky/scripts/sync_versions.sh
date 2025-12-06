#!/bin/bash

# Sync version from package.json to tauri.conf.json and Cargo.toml

# Get version from package.json (from staged or working copy)
VERSION=$(cat package.json | grep '"version"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "❌ Could not read version from package.json"
  exit 1
fi

TAURI_CONF="src-tauri/tauri.conf.json"
CARGO_TOML="src-tauri/Cargo.toml"

# Get current versions from the files
TAURI_VERSION=$(cat "$TAURI_CONF" | grep '"version"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
CARGO_VERSION=$(cat "$CARGO_TOML" | grep '^version' | head -1 | sed 's/.*= *"\([^"]*\)".*/\1/')

UPDATED=false

# Update tauri.conf.json if needed
if [ "$TAURI_VERSION" != "$VERSION" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"version\": \"$TAURI_VERSION\"/\"version\": \"$VERSION\"/" "$TAURI_CONF"
  else
    sed -i "s/\"version\": \"$TAURI_VERSION\"/\"version\": \"$VERSION\"/" "$TAURI_CONF"
  fi
  git add "$TAURI_CONF"
  echo "📦 Updated tauri.conf.json: $TAURI_VERSION → $VERSION"
  UPDATED=true
fi

# Update Cargo.toml if needed
if [ "$CARGO_VERSION" != "$VERSION" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^version = \"$CARGO_VERSION\"/version = \"$VERSION\"/" "$CARGO_TOML"
  else
    sed -i "s/^version = \"$CARGO_VERSION\"/version = \"$VERSION\"/" "$CARGO_TOML"
  fi
  git add "$CARGO_TOML"
  echo "🦀 Updated Cargo.toml: $CARGO_VERSION → $VERSION"
  UPDATED=true
fi

if [ "$UPDATED" = true ]; then
  echo "✅ Versions synced to $VERSION"
fi

exit 0
