/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "node_api.h"
#include "node_api_types.h"

namespace zmq {
/* Pending https://github.com/nodejs/node-addon-api/issues/223 */
struct CallbackScope {
    napi_env env;
    napi_callback_scope scope;

    CallbackScope(napi_env env) : env(env) {
        napi_async_context context;
        napi_value resource_name;
        napi_create_string_utf8(env, "zmq", NAPI_AUTO_LENGTH, &resource_name);
        napi_async_init(env, nullptr, resource_name, &context);
        napi_open_callback_scope(env, nullptr, context, &scope);
    }

    ~CallbackScope() {
        napi_close_callback_scope(env, scope);
    }
};
}
