/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include "napi_compat.h"

namespace zmq {
template <typename F>
inline void AtExit(napi_env env, F f) {
    auto status = napi_add_env_cleanup_hook(env, f, nullptr);
    NAPI_THROW_IF_FAILED(env, status);
}
}
