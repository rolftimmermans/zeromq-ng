#pragma once

#include "node.h"

/* https://github.com/nodejs/abi-stable-node/issues/330 */
inline napi_status napi_add_env_cleanup_hook(
    napi_env, void (*fun)(void* arg), void* arg) {
    node::AtExit(fun, arg);
    return napi_ok;
}
