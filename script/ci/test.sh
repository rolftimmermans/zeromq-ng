#!/bin/sh
set -e

if [ -n "${WINDIR}" ]; then
  # Give preference to MSYS64 binaries to make timeout command work.
  export PATH="/usr/bin:${PATH}"
elif [ "$TRAVIS_OS_NAME" = "osx" ]; then
  # On homebrew timeout is aliased as gtimeout.
  alias timeout=gtimeout
fi

# Tests can sometimes hang in CI environments. To ensure this does not cause
# very long timeouts (10 minutes on Travis, 60 on AppVeyor), we're going to
# enforce a 60 second timeout ourselves. If that fails it should be retried.
if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn dev:build
  /alpine/enter-chroot timeout 60 yarn dev:test
else
  yarn dev:build
  timeout 60 yarn dev:test
fi
