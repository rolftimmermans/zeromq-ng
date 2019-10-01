/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#define NAPI_THROW_IF_FAILED(env, status, ...)                                           \
    if ((status) != napi_ok) {                                                           \
        Napi::Error::New(env).ThrowAsJavaScriptException();                              \
        return __VA_ARGS__;                                                              \
    }

#define NAPI_BUILD_VERSION NAPI_VERSION
