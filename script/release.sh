#!/bin/sh

if [ -n "${WINDIR}" ]; then
  # Give preference to all MSYS64 binaries. This solves issues with mkdir and
  # other commands not working properly.
  export PATH="/usr/bin:${PATH}"
  export PYTHON="/c/Python27/python"
fi

detect-libc prebuild --verbose --target 8.6.0 --strip --upload ${GH_TOKEN}
