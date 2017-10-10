#!/bin/sh
if [ -z "$CI" ]; then
  clang-format -i -style=file src/*.cc src/*.h src/inline/*.h
fi
