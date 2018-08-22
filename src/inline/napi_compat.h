/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#define NAPI_BUILD_VERSION NAPI_VERSION

#if NAPI_BUILD_VERSION < 3
#include "napi_callback_scope.h"
#endif

#if NAPI_BUILD_VERSION < 4
/* https://github.com/nodejs/abi-stable-node/issues/330 */
#include "node.h"

inline napi_status napi_add_env_cleanup_hook(
    napi_env, void (*fun)(void* arg), void* arg) {
    node::AtExit(fun, arg);
    return napi_ok;
}
#endif
