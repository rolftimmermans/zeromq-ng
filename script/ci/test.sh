#!/bin/sh
set -e

if [ "$TRAVIS_OS_NAME" = "osx" ]; then
  alias timeout=gtimeout
fi

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn build
  /alpine/enter-chroot timeout -t 60 yarn test
else
  yarn build
  timeout 60 yarn test
fi
