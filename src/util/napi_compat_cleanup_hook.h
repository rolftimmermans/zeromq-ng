#pragma once

typedef void (*cb)(void* arg);

/* https://github.com/nodejs/abi-stable-node/issues/330 */
inline napi_status napi_add_env_cleanup_hook(napi_env, cb fn, void* arg) {
    node::AtExit(fn, nullptr);
    return napi_ok;
}
