#!/bin/sh
if [ -z "$CI" ] && command -v clang-format >/dev/null; then
  echo "Formatting source files..."
  clang-format -i -style=file src/*.cc src/*.h src/inline/*.h
else
  echo "Skipping source formatting..."
fi
