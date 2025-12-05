#!/bin/bash

# Get staged files for formatting (JS/TS/Svelte/CSS/HTML/JSON)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(js|ts|svelte|css|html|json)$')

# Get staged files for linting (only JS/TS/Svelte - ESLint doesn't handle JSON)
LINT_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(js|ts|svelte)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No files to format or lint"
  exit 0
fi

# Format staged files
echo "🎨 Formatting staged files..."
echo "$STAGED_FILES" | xargs prettier --write --ignore-unknown

# Re-add formatted files to staging
echo "$STAGED_FILES" | xargs git add

# Lint staged files (only if there are lintable files)
if [ -z "$LINT_FILES" ]; then
  echo "✅ No files to lint"
  exit 0
fi

echo ""
echo "🔍 Linting staged files..."
LINT_OUTPUT=$(echo "$LINT_FILES" | xargs eslint 2>&1)
LINT_EXIT_CODE=$?

if [ $LINT_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "⚠️  Lint errors found:"
  echo ""
  echo "$LINT_OUTPUT"
  echo ""

  # Try to read from /dev/tty (works even when stdin is redirected)
  if [ -e /dev/tty ]; then
    read -p "Continue anyway? [y/N] " -n 1 -r < /dev/tty
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
