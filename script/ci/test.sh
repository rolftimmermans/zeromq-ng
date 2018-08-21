#!/bin/sh
set -e

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot timeout -t 60 yarn test
else
  timeout 60 yarn test
fi
