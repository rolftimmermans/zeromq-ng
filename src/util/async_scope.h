/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

namespace zmq {
class AsyncScope {
    Napi::HandleScope handle_scope;
    Napi::CallbackScope callback_scope;

public:
    inline explicit AsyncScope(Napi::Env env, Napi::AsyncContext&& context)
        : handle_scope(env), callback_scope(env, std::move(context)) {}

    inline explicit AsyncScope(Napi::Env env, const char* name)
        : handle_scope(env), callback_scope(env, Napi::AsyncContext(env, name)) {}
};
}
