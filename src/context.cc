/* Copyright (c) 2017 Rolf Timmermans */
#include "context.h"

namespace zmq {
/* Create a reference to a single global context that is automatically
   closed on process exit. This is the default context. */
Napi::ObjectReference GlobalContext;

Napi::FunctionReference Context::Constructor;

Context::Context(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Context>(info) {
    auto args = {
        Argument{"Options must be an object",
            &Napi::Value::IsObject, &Napi::Value::IsUndefined},
    };

    if (!ValidateArguments(info, args)) return;

    context = zmq_ctx_new();
    if (!context) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    if (info[0].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[0].As<Napi::Object>());
    }
}

Context::~Context() {
    Close();
}

void Context::Close() {
    if (context != nullptr) {
        if (zmq_ctx_shutdown(context) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }

        /* Can block if there are sockets that aren't closed, but that
           should not happen because the objects keep the context alive. */
        if (zmq_ctx_term(context) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }

        context = nullptr;
    }
}

void Context::Close(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;
    Close();
}

template <>
Napi::Value Context::GetCtxOpt<bool>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = zmq_ctx_get(context, option);
    if (value < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Boolean::New(Env(), value);
}

template <>
void Context::SetCtxOpt<bool>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a boolean", &Napi::Value::IsBoolean},
    };

    if (!ValidateArguments(info, args)) return;

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = info[1].As<Napi::Boolean>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <typename T>
Napi::Value Context::GetCtxOpt(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    T value = zmq_ctx_get(context, option);
    if (value < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Number::New(Env(), value);
}

template <typename T>
void Context::SetCtxOpt(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return;

    uint32_t option = info[0].As<Napi::Number>();

    T value = info[1].As<Napi::Number>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

void Context::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("close", &Context::Close),

        InstanceMethod("getBoolOption", &Context::GetCtxOpt<bool>),
        InstanceMethod("setBoolOption", &Context::SetCtxOpt<bool>),
        InstanceMethod("getInt32Option", &Context::GetCtxOpt<int32_t>),
        InstanceMethod("setInt32Option", &Context::SetCtxOpt<int32_t>),
    };

    auto constructor = DefineClass(env, "Context", proto);

    /* Create global context that is closed on process exit. */
    auto global = constructor.New({});

    GlobalContext = Napi::Persistent(global);
    GlobalContext.SuppressDestruct();

    exports.Set("global", global);

    node::AtExit(
        [](void*) {
            /* Close global context and release reference. */
            Context::Unwrap(GlobalContext.Value())->Close();
        },
        nullptr);

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Context", constructor);
}
}
