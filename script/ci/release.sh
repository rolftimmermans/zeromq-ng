#!/bin/sh
set -e

if [ -n "${WINDIR}" ]; then
  # Give preference to all MSYS64 binaries. This solves issues with mkdir and
  # other commands not working properly.
  export PATH="/usr/bin:${PATH}"
  export PYTHON="/c/Python27/python"
fi

echo "Releasing binary..."
if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot node_modules/.bin/node-pre-gyp configure build --verbose
else
  node_modules/.bin/node-pre-gyp configure build --verbose
fi

if [ -z "${WINDIR}" ]; then
  if [ -n "${ALPINE_CHROOT}" ]; then
    /alpine/enter-chroot strip -Sx lib/binary/*.node
  else
    strip -Sx lib/binary/*.node
  fi
fi

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot node_modules/.bin/node-pre-gyp package
else
  node_modules/.bin/node-pre-gyp package
fi

export NODE_PRE_GYP_GITHUB_TOKEN="${GH_TOKEN}"
if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot node_modules/.bin/node-pre-gyp-github publish --release
else
  node_modules/.bin/node-pre-gyp-github publish --release
fi
