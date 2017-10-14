#!/bin/sh
set -e

export CC="${TRIPLE}-gcc-${GCC}"
export CXX="${TRIPLE}-g++-${GCC}"
export STRIP="${TRIPLE}-strip"
export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

echo "Releasing binary for ${TRIPLE}..."
node_modules/.bin/node-pre-gyp configure build package --target_arch=${ARCH}

export NODE_PRE_GYP_GITHUB_TOKEN="${GH_TOKEN}"
node_modules/.bin/node-pre-gyp-github publish --release --target_arch=${ARCH}
