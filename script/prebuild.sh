#!/bin/sh
set -e

ZMQ_VERSION=${ZMQ_VERSION:-"4.2.5"}

if [ "${ZMQ_VERSION}" \< "4.1.0" ]; then
  ZMQ_GH_REPO="zeromq4-x"
elif [ "${ZMQ_VERSION}" \< "4.2.0" ]; then
  ZMQ_GH_REPO="zeromq4-1"
else
  ZMQ_GH_REPO="libzmq"
fi

if [ -n "${WINDIR}" ]; then
  # We're on Windows. Download a prebuilt library.
  export ARCH=$(node -p 'process.arch')

  # Working directory is "build"
  ZMQ_PREFIX="${PWD}/libzmq"

  ZMQ_BINARY="https://github.com/nteract/libzmq-win/releases/download/v2.1.0/libzmq-${ZMQ_VERSION}-${ARCH}.lib"
  ZMQ_HEADER="https://raw.githubusercontent.com/zeromq/${ZMQ_GH_REPO}/v${ZMQ_VERSION}/include/zmq.h"
  ZMQ_LIB="libzmq.lib"
  ZMQ_H="zmq.h"

  # Give preference to all MSYS64 binaries. This solves issues with mkdir and
  # other commands not working properly.
  export PATH="/usr/bin:${PATH}"
  export PYTHON="/c/Python27/python"

  mkdir -p "${ZMQ_PREFIX}/lib"
  mkdir -p "${ZMQ_PREFIX}/include"

  echo "Downloading libzmq binary..."
  curl "${ZMQ_BINARY}" -fsSL -o "${ZMQ_PREFIX}/lib/${ZMQ_LIB}"
  curl "${ZMQ_HEADER}" -fsSL -o "${ZMQ_PREFIX}/include/${ZMQ_H}"
else
  # Working directory is project directory.
  ZMQ_PREFIX="${PWD}/build/libzmq"

  ZMQ_SOURCE="https://github.com/zeromq/${ZMQ_GH_REPO}/releases/download/v${ZMQ_VERSION}/zeromq-${ZMQ_VERSION}.tar.gz"
  ZMQ_SRC_DIR="zeromq-${ZMQ_VERSION}"
  ZMQ_TARBALL="zeromq-${ZMQ_VERSION}.tar.gz"
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
      curl "${ZMQ_SOURCE}" -fsSL -o "${ZMQ_TARBALL}"
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
      export ZMQ_BUILD_OPTIONS="--disable-shared --with-relaxed --without-documentation ${ZMQ_BUILD_OPTIONS}"
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
fi
