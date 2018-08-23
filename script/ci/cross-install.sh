#!/bin/sh
set -e

export CC="${TRIPLE}-gcc-${GCC}"
export CXX="${TRIPLE}-g++-${GCC}"
export STRIP="${TRIPLE}-strip"
export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

echo "Installing dependencies for ${TRIPLE}..."

if [ -n "${ZMQ_SHARED}" ]; then
  export npm_config_zmq_shared=true
fi

export npm_config_build_from_source=true
export npm_config_target_arch=${ARCH}
yarn install
yarn dev:configure
