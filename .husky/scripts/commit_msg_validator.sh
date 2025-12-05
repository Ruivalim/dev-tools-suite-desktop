#!/bin/bash

# Conventional Commits validator
# Format: type(scope): description  OR  type: description
# Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Skip merge commits
if echo "$COMMIT_MSG" | grep -qE "^Merge "; then
  exit 0
fi

# Conventional commits regex
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo ""
  echo "❌ Invalid commit message format"
  echo ""
  echo "Expected: <type>(<scope>): <description>"
  echo "          <type>: <description>"
  echo ""
  echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
  echo ""
  echo "Examples:"
  echo "  feat: add user authentication"
  echo "  fix(api): resolve timeout issue"
  echo "  docs: update README"
  echo ""
  echo "Your message: $COMMIT_MSG"
  echo ""

  # Try to read from /dev/tty
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
fi

exit 0
