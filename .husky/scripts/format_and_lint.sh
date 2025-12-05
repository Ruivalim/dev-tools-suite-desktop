#!/bin/bash

# Get staged files (only JS/TS/Svelte/CSS/HTML/JSON)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(js|ts|svelte|css|html|json)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No files to format or lint"
  exit 0
fi

# Format staged files
echo "🎨 Formatting staged files..."
echo "$STAGED_FILES" | xargs prettier --write --ignore-unknown

# Re-add formatted files to staging
echo "$STAGED_FILES" | xargs git add

# Lint staged files
echo ""
echo "🔍 Linting staged files..."
LINT_OUTPUT=$(echo "$STAGED_FILES" | xargs eslint 2>&1)
LINT_EXIT_CODE=$?

if [ $LINT_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "⚠️  Lint errors found:"
  echo ""
  echo "$LINT_OUTPUT"
  echo ""

  # Try to read from /dev/tty (works even when stdin is redirected)
  if [ -e /dev/tty ]; then
    exec < /dev/tty

    read -p "Continue anyway? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Commit aborted."
      exit 1
    fi
  else
    echo "No terminal available. Use --no-verify to skip this check."
    exit 1
  fi
else
  echo "✅ No lint errors"
fi

exit 0
