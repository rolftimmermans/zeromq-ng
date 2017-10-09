#!/bin/sh
find src -path -prune -o \( -name "*.cc" -or -name "*.h" \) -exec clang-format -i -style=file {} \;
