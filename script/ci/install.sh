#!/bin/sh
set -e

echo "Installing dependencies..."

if [ -n "${ALPINE_CHROOT}" ]; then
  sudo script/ci/alpine-chroot-install.sh -b v3.10 -p 'nodejs-dev yarn build-base git cmake curl python2 coreutils' -k 'CI TRAVIS_.* ZMQ_.* NODE_.* npm_.*'
fi

if [ -n "${ZMQ_SHARED}" ]; then
  export npm_config_zmq_shared=true
fi

export npm_config_build_from_source=true

# Installing node-gyp globally facilitates calling it in various ways, not just
# via yarn but also via bin stubs in node_modules (even on Windows).
if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn global add node-gyp

  if [ -n "${IGNORE_SCRIPTS}" ]; then
    /alpine/enter-chroot yarn install --ignore-scripts
  else
    /alpine/enter-chroot yarn install
  fi
else
  yarn global add node-gyp

  if [ -n "${IGNORE_SCRIPTS}" ]; then
    yarn install --ignore-scripts
  else
    yarn install
  fi
fi
