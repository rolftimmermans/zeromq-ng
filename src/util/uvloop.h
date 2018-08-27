/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include "napi_compat.h"

namespace zmq {
inline uv_loop_t* UvLoop(Napi::Env env) {
    uv_loop_t* loop = nullptr;
    napi_get_uv_event_loop(env, &loop);
    return loop;
}
}
