#!/bin/sh
set -e

echo "Building distribution binary..."

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn ci:prebuild
else
  yarn ci:prebuild
fi

ARCHIVE_NAME="${TRAVIS_TAG:-latest}-${TRAVIS_OS_NAME}.tar.gz"
tar -zcvf "${ARCHIVE_NAME}" -C "${TRAVIS_BUILD_DIR}" prebuilds
