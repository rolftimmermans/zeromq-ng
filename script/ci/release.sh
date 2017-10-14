#!/bin/sh
set -e

if [ -n "${WINDIR}" ]; then
  # Give preference to all MSYS64 binaries. This solves issues with mkdir and
  # other commands not working properly.
  export PATH="/usr/bin:${PATH}"
  export PYTHON="/c/Python27/python"
fi

echo "Releasing binary..."
node-pre-gyp configure build package

export NODE_PRE_GYP_GITHUB_TOKEN="${GH_TOKEN}"
node-pre-gyp-github package publish --release
