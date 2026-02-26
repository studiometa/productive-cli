#!/bin/sh
#
# Check that source files have colocated test files.
#
# Scans packages/*/src/**/*.ts for files missing a corresponding .test.ts.
# Excludes: index.ts, types.ts, *.d.ts, and dist/ directories.
#
# Exit code 0 always (informational). Prints a report of missing tests.

MISSING=0
TOTAL=0

for f in $(find packages/*/src -name '*.ts' \
  ! -name '*.test.ts' \
  ! -name '*.d.ts' \
  ! -name 'index.ts' \
  ! -name 'types.ts' \
  ! -path '*/dist/*' \
  | sort); do

  TOTAL=$((TOTAL + 1))
  test_file="${f%.ts}.test.ts"

  if [ ! -f "$test_file" ]; then
    if [ "$MISSING" -eq 0 ]; then
      echo "⚠️  Source files missing colocated tests:"
      echo ""
    fi
    echo "   $f"
    MISSING=$((MISSING + 1))
  fi
done

COVERED=$((TOTAL - MISSING))

echo ""
echo "📊 Test colocation: $COVERED/$TOTAL source files have tests ($MISSING missing)"

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "   Create missing test files: foo.ts → foo.test.ts (same directory)"
fi
