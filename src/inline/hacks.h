/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include "node_api.h"
#include "node_api_types.h"

#define NAPI_THROW_IF_FAILED(env, status, ...)                                           \
    if ((status) != napi_ok) {                                                           \
        Napi::Error::New(env).ThrowAsJavaScriptException();                              \
        return;                                                                          \
    }

namespace zmq {
/* Pending https://github.com/nodejs/node-addon-api/issues/223 */
struct CallbackScope {
    napi_env env;
    napi_handle_scope handle_scope;
    napi_callback_scope callback_scope;

    CallbackScope(napi_env env) : env(env) {
        napi_status status;
        napi_async_context context;
        napi_value resource_name, resource_object;

        status = napi_open_handle_scope(env, &handle_scope);
        NAPI_THROW_IF_FAILED(env, status);

        status = napi_create_string_utf8(env, "zmq", NAPI_AUTO_LENGTH, &resource_name);
        NAPI_THROW_IF_FAILED(env, status);

        status = napi_create_object(env, &resource_object);
        NAPI_THROW_IF_FAILED(env, status);

        status = napi_async_init(env, resource_object, resource_name, &context);
        NAPI_THROW_IF_FAILED(env, status);

        status = napi_open_callback_scope(env, resource_object, context, &callback_scope);
        NAPI_THROW_IF_FAILED(env, status);
    }

    ~CallbackScope() {
        napi_status status;
        status = napi_close_callback_scope(env, callback_scope);
        NAPI_THROW_IF_FAILED(env, status);

        status = napi_close_handle_scope(env, handle_scope);
        NAPI_THROW_IF_FAILED(env, status);
    }
};
}
