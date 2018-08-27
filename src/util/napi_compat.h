/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#define NAPI_THROW_IF_FAILED(env, status, ...)                                           \
    if ((status) != napi_ok) {                                                           \
        Napi::Error::New(env).ThrowAsJavaScriptException();                              \
        return __VA_ARGS__;                                                              \
    }

#define NAPI_BUILD_VERSION NAPI_VERSION

#if NAPI_BUILD_VERSION < 4
#undef NAPI_VERSION
#include "node.h"
#undef NAPI_VERSION
#define NAPI_VERSION NAPI_BUILD_VERSION
#endif

#if NAPI_BUILD_VERSION < 3
#include "napi_compat_callback_scope.h"
#include "napi_compat_event_loop.h"
#endif

#if NAPI_BUILD_VERSION < 4
#include "napi_compat_cleanup_hook.h"
#endif
