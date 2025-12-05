#!/bin/bash

# Check if package.json version was updated
CURRENT_VERSION=$(git show HEAD:package.json 2>/dev/null | grep '"version"' | sed 's/.*: *"\([^"]*\)".*/\1/')
STAGED_VERSION=$(git show :package.json 2>/dev/null | grep '"version"' | sed 's/.*: *"\([^"]*\)".*/\1/')

# If no previous commit exists (initial commit), skip the check
if [ -z "$CURRENT_VERSION" ]; then
  exit 0
fi

# If package.json is not staged, skip the check
if [ -z "$STAGED_VERSION" ]; then
  STAGED_VERSION="$CURRENT_VERSION"
fi

if [ "$CURRENT_VERSION" = "$STAGED_VERSION" ]; then
  echo ""
  echo "⚠️  package.json version has not been updated (currently: $CURRENT_VERSION)"
  echo ""

  # Try to read from /dev/tty (works even when stdin is redirected)
  if [ -e /dev/tty ]; then
    read -p "Would you like to update the version? [y/N] " -n 1 -r < /dev/tty
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "Current version: $CURRENT_VERSION"
      read -p "Enter new version: " NEW_VERSION < /dev/tty

      if [ -n "$NEW_VERSION" ]; then
        # Update the version in package.json
        if [[ "$OSTYPE" == "darwin"* ]]; then
          sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        else
          sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        fi

        git add package.json
        echo "✅ Version updated to $NEW_VERSION and staged"
      else
        echo "No version entered. Aborting commit."
        exit 1
      fi
    else
      read -p "Continue without updating version? [y/N] " -n 1 -r < /dev/tty
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Commit aborted."
        exit 1
      fi
    fi
  else
    echo "No terminal available. Use --no-verify to skip this check."
    exit 1
  fi
fi

exit 0
