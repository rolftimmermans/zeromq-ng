#!/bin/sh
set -e

if [ "${npm_config_zmq_shared}" = "true" ] || [ "${ZMQ_SHARED}" = "true" ]; then
  echo "Requesting to use dynamically linked libzmq; skipping build..."
  export ARGS="--zmq-shared"
else
  export ZMQ_VERSION=${ZMQ_VERSION:-"4.2.2"}

  if [ "${ZMQ_VERSION}" \< "4.1.0" ]; then
    export ZMQ_REPO="zeromq4-x"
  elif [ "${ZMQ_VERSION}" \< "4.2.0" ]; then
    export ZMQ_REPO="zeromq4-1"
  else
    export ZMQ_REPO="libzmq"
  fi

  export ZMQ_PREFIX="${PWD}/libzmq"
  export ZMQ_SOURCE="https://github.com/zeromq/${ZMQ_REPO}/releases/download/v${ZMQ_VERSION}/zeromq-${ZMQ_VERSION}.tar.gz"
  export ZMQ_SRC_DIR="zeromq-${ZMQ_VERSION}"
  export ZMQ_TARBALL="zeromq-${ZMQ_VERSION}.tar.gz"
  export MACOSX_DEPLOYMENT_TARGET=10.9

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

    if [ "${npm_config_zmq_draft}" = "true" ] || [ "${ZMQ_DRAFT}" = "true" ]; then
      export ZMQ_BUILD_OPTIONS=--enable-drafts ${ZMQ_BUILD_OPTIONS}
    fi

    if [ "${ZMQ_VERSION}" \< "4.1.0" ]; then
      # Do not disable shared library because it will fail to build the
      # curve keygen tool, which cannot be excluded before 4.1.
      export ZMQ_BUILD_OPTIONS="--with-relaxed --without-documentation ${ZMQ_BUILD_OPTIONS}"
    elif [ "${ZMQ_VERSION}" \< "4.2.0" ]; then
      export ZMQ_BUILD_OPTIONS="--disable-shared --disable-curve-keygen --with-relaxed --without-documentation ${ZMQ_BUILD_OPTIONS}"
    else
      export ZMQ_BUILD_OPTIONS="--disable-shared --disable-curve-keygen --disable-pedantic --without-docs ${ZMQ_BUILD_OPTIONS}"
    fi

    # Build as static library, don't build curve_keygen binary.
    ./configure "--prefix=${ZMQ_PREFIX}" --enable-static ${ZMQ_BUILD_OPTIONS}

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
