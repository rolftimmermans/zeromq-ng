/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "proxy.h"
#include "context.h"
#include "socket.h"

#include "inline/callback_scope.h"
#include "inline/work.h"

#ifdef ZMQ_HAS_STEERABLE_PROXY

namespace zmq {
Napi::FunctionReference Proxy::Constructor;

struct ProxyContext {
    std::string address;
    uint32_t error = 0;

public:
    ProxyContext(std::string&& address) : address(std::move(address)) {}
};

Proxy::Proxy(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Proxy>(info) {
    auto args = {
        Argument{"Front-end must be a socket object", &Napi::Value::IsObject},
        Argument{"Back-end must be a socket object", &Napi::Value::IsObject},
    };

    if (!ValidateArguments(info, args)) return;

    front_ref.Reset(info[0].As<Napi::Object>(), 1);
    Socket::Unwrap(front_ref.Value());
    if (Env().IsExceptionPending()) return;

    back_ref.Reset(info[1].As<Napi::Object>(), 1);
    Socket::Unwrap(back_ref.Value());
    if (Env().IsExceptionPending()) return;
}

Proxy::~Proxy() {}

Napi::Value Proxy::Run(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return Env().Undefined();

    auto front = Socket::Unwrap(front_ref.Value());
    if (Env().IsExceptionPending()) return Env().Undefined();

    auto back = Socket::Unwrap(back_ref.Value());
    if (Env().IsExceptionPending()) return Env().Undefined();

    if (front->endpoints == 0) {
        Napi::Error::New(info.Env(), "Front-end socket must be bound or connected")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (back->endpoints == 0) {
        Napi::Error::New(info.Env(), "Back-end socket must be bound or connected")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    auto context = Context::Unwrap(front->context_ref.Value());
    if (Env().IsExceptionPending()) return Env().Undefined();

    control_sub = zmq_socket(context->context, ZMQ_DEALER);
    if (control_sub == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    control_pub = zmq_socket(context->context, ZMQ_DEALER);
    if (control_pub == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    /* Use `this` pointer as unique identifier for control socket. */
    auto address = std::string("inproc://zmq.proxycontrol.")
        + to_string(reinterpret_cast<uintptr_t>(this));

    /* Connect publisher so we can start queueing control messages. */
    if (zmq_connect(control_pub, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    front->state = Socket::State::Blocked;
    back->state = Socket::State::Blocked;

    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx = std::make_shared<ProxyContext>(std::move(address));

    auto front_ptr = front->socket;
    auto back_ptr = back->socket;

    Work::Queue(
        [=]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            if (zmq_bind(control_sub, run_ctx->address.c_str()) < 0) {
                run_ctx->error = zmq_errno();
                return;
            }

            if (zmq_proxy_steerable(front_ptr, back_ptr, nullptr, control_sub) < 0) {
                run_ctx->error = zmq_errno();
                return;
            }
        },
        [=]() {
            CallbackScope scope(Env());

            front->Close();
            back->Close();

            auto err1 = zmq_close(control_pub);
            assert(err1 == 0);

            auto err2 = zmq_close(control_sub);
            assert(err2 == 0);

            control_pub = nullptr;
            control_sub = nullptr;

            if (run_ctx->error != 0) {
                res.Reject(ErrnoException(Env(), run_ctx->error).Value());
                return;
            }

            res.Resolve(Env().Undefined());
        });

    return res.Promise();
}

void Proxy::SendCommand(const char* command) {
    while (zmq_send_const(control_pub, command, strlen(command), ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }
    }
}

void Proxy::Pause(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;
    SendCommand("PAUSE");
}

void Proxy::Resume(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;
    SendCommand("RESUME");
}

void Proxy::Terminate(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;
    SendCommand("TERMINATE");
}

Napi::Value Proxy::GetFrontEnd(const Napi::CallbackInfo& info) {
    return front_ref.Value();
}

Napi::Value Proxy::GetBackEnd(const Napi::CallbackInfo& info) {
    return back_ref.Value();
}

void Proxy::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("run", &Proxy::Run), InstanceMethod("pause", &Proxy::Pause),
        InstanceMethod("resume", &Proxy::Resume),
        InstanceMethod("terminate", &Proxy::Terminate),

        InstanceAccessor("frontEnd", &Proxy::GetFrontEnd, nullptr),
        InstanceAccessor("backEnd", &Proxy::GetBackEnd, nullptr),
    };

    auto constructor = DefineClass(env, "Proxy", proto);

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Proxy", constructor);
}
}

#endif
