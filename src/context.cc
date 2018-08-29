/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "context.h"

#include "util/callback_scope.h"
#include "util/napi_compat.h"
#include "util/uvwork.h"

namespace zmq {
/* Create a reference to a single global context that is automatically
   closed on process exit. This is the default context. */
Napi::ObjectReference GlobalContext;

Napi::FunctionReference Context::Constructor;

Context::Context(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Context>(info) {
    auto args = {
        Argument{"Options must be an object", &Napi::Value::IsObject,
            &Napi::Value::IsUndefined},
    };

    if (!ValidateArguments(info, args)) return;

    context = zmq_ctx_new();
    if (!context) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    /* There is no reason why these should fail, so just assert. Callbacks are
       called in reverse order. */
    auto status = napi_add_env_cleanup_hook(Env(), &Context::Terminate, context);
    assert(status == napi_ok);

    status = napi_add_env_cleanup_hook(Env(), &Context::CloseAll, &sockets);
    assert(status == napi_ok);

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    if (info[0].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[0].As<Napi::Object>());
    }
}

Context::~Context() {
    if (context != nullptr) {
        /* We should not have any associated sockets anymore if the context can
           be gc'ed, since all sockets must have been closed first. */
        assert(sockets.size() == 0);

        /* Messages may still be in the pipeline, so we only shutdown
           and do not terminate the context just yet. */
        auto err = zmq_ctx_shutdown(context);
        assert(err == 0);

        /* Sockets are closed and the list of sockets is deallocated, so we
           must unregister the close all cleanup hook. */
        auto status = napi_remove_env_cleanup_hook(Env(), &Context::CloseAll, &sockets);
        assert(status == napi_ok);

        context = nullptr;
    }
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

void Context::CloseAll(void* set) {
    auto& sockets = *static_cast<std::unordered_set<void*>*>(set);

    /* Close all sockets. */
    for (auto socket : sockets) {
        auto err = zmq_close(socket);
        assert(err == 0);
    }
}

void Context::Terminate(void* context) {
    /* May block if messages still have to be sent. */
    auto err = zmq_ctx_term(context);
    assert(err == 0);
}

void Context::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
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

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Context", constructor);
}
}
