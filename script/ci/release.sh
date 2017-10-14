#!/bin/sh
set -e

if [ -n "${WINDIR}" ]; then
  # Give preference to all MSYS64 binaries. This solves issues with mkdir and
  # other commands not working properly.
  export PATH="/usr/bin:${PATH}"
  export PYTHON="/c/Python27/python"
fi

echo "Releasing binary..."
node_modules/.bin/node-pre-gyp configure build --verbose

if [ -z "${WINDIR}" ]; then strip -Sx lib/binary/*.node fi
node_modules/.bin/node-pre-gyp package

export NODE_PRE_GYP_GITHUB_TOKEN="${GH_TOKEN}"
node_modules/.bin/node-pre-gyp-github publish --release
