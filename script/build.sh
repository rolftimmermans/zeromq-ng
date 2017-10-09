#!/bin/sh
set -e

if [ "${npm_config_zmq_dynamic}" == "true" ] || [ "${ZMQ_DYNAMIC}" == "true" ]; then
  echo "Requesting to use dynamically linked libzmq; skipping build..."
  export ARGS="--zmq-dynamic"
else
  export MACOSX_DEPLOYMENT_TARGET=10.9
  export ZMQ_REPO="libzmq"
  export ZMQ_VERSION=${ZMQ_VERSION:-"4.2.2"}
  export ZMQ_PREFIX="${PWD}/libzmq"
  export ZMQ_SOURCE="https://github.com/zeromq/${ZMQ_REPO}/releases/download/v${ZMQ_VERSION}/zeromq-${ZMQ_VERSION}.tar.gz"
  export ZMQ_SRC_DIR="zeromq-${ZMQ_VERSION}"
  export ZMQ_TARBALL="zeromq-${ZMQ_VERSION}.tar.gz"

  mkdir -p "${ZMQ_PREFIX}"
  cd "${ZMQ_PREFIX}"

  if [ -f "lib/libzmq.a" ]; then
    echo "Found previously built libzmq; skipping rebuild..."
  else
    if [ -f "${ZMQ_TARBALL}" ]; then
      echo "Found libzmq source; skipping download..."
    else
      echo "Downloading libzmq source..."
      curl "${ZMQ_SOURCE}" -sLo "${ZMQ_TARBALL}" -q
    fi

    export CFLAGS=-fPIC
    export CXXFLAGS=-fPIC
    export PKG_CONFIG_PATH="${ZMQ_PREFIX}/lib/pkgconfig"

    test -d "${ZMQ_SRC_DIR}" || tar xzf "${ZMQ_TARBALL}"
    cd "${ZMQ_SRC_DIR}"

    echo "Building libzmq..."
    test -f configure || ./autogen.sh
    if [[ "${ZMQ_VERSION}" < "4.2.0" ]]; then
      ./configure "--prefix=${ZMQ_PREFIX}" --with-relaxed --enable-static --disable-shared --without-documentation ${ZMQ_BUILD_OPTIONS}
    else
      ./configure "--prefix=${ZMQ_PREFIX}" --disable-pedantic --enable-static --disable-shared --without-docs ${ZMQ_BUILD_OPTIONS}
    fi

    make -j 2
    make install

    cd "${ZMQ_PREFIX}"
    rm -rf "${ZMQ_SRC_DIR}" "${ZMQ_TARBALL}"
  fi

  cd ".."
  export ARGS=""
fi

echo "Building libzmq bindings..."
node-gyp rebuild "$@" $ARGS

echo "Build complete."
