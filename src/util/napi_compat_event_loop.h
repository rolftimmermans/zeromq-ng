#pragma once

#include "node.h"
#include "uv.h"

inline napi_status napi_get_uv_event_loop(napi_env, uv_loop_t** loop) {
    *loop = uv_default_loop();
    return napi_ok;
}
