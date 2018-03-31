/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "socket.h"
#include "context.h"
#include "inline/callback_scope.h"
#include "observer.h"

#include "inline/incoming.h"
#include "inline/outgoing.h"
#include "inline/work.h"

#include <cmath>
#include <limits>
#include <set>

namespace zmq {
/* Ordinary static cast for all available numeric types. */
template <typename T>
T number_cast(const Napi::Number& num) {
    return static_cast<T>(num);
}

/* Specialization for uint64_t; check for out of bounds and warn on values
   that cannot be represented accurately. */
template <>
uint64_t number_cast<uint64_t>(const Napi::Number& num) {
    auto value = num.DoubleValue();

    if (std::nextafter(value, -0.0) < 0) return 0;

    if (value > static_cast<double>((1ull << 53) - 1)) {
        Warn(num.Env(),
            "Value is larger than Number.MAX_SAFE_INTEGER and may not be rounded "
            "accurately");
    }

    /* If the next representable value of the double is beyond the maximum
       integer, then assume the maximum integer. */
    if (std::nextafter(value, std::numeric_limits<double>::infinity())
        > std::numeric_limits<uint64_t>::max()) {
        return std::numeric_limits<uint64_t>::max();
    }

    return static_cast<uint64_t>(value);
}

struct AddressContext {
    std::string address;
    uint32_t error = 0;

public:
    AddressContext(std::string&& address) : address(std::move(address)) {}
};

Napi::FunctionReference Socket::Constructor;

Socket::Socket(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Socket>(info) {
    auto args = {
        Argument{"Socket type must be a number", &Napi::Value::IsNumber},
        Argument{"Options must be an object", &Napi::Value::IsObject,
            &Napi::Value::IsUndefined},
    };

    if (!ValidateArguments(info, args)) return;

    auto type = info[0].As<Napi::Number>().Int32Value();

    if (info[1].IsObject()) {
        auto options = info[1].As<Napi::Object>();
        if (options.Has("context")) {
            context_ref.Reset(options.Get("context").As<Napi::Object>(), 1);
            options.Delete("context");
        } else {
            context_ref.Reset(GlobalContext.Value(), 1);
        }
    } else {
        context_ref.Reset(GlobalContext.Value(), 1);
    }

    auto context = Context::Unwrap(context_ref.Value());
    if (Env().IsExceptionPending()) return;

    socket = zmq_socket(context->context, type);
    if (socket == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    uv_os_sock_t fd;
    size_t length = sizeof(fd);
    if (zmq_getsockopt(socket, ZMQ_FD, &fd, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    if (poller.Init(fd) < 0) {  // FIXME
        ErrnoException(Env(), errno).ThrowAsJavaScriptException();
        return;
    }

    poller.ValidateReadable(std::bind(&Socket::HasEvents, this, ZMQ_POLLIN));
    poller.ValidateWritable(std::bind(&Socket::HasEvents, this, ZMQ_POLLOUT));

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    /* Set any options after the socket has been successfully created. */
    if (info[1].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[1].As<Napi::Object>());
    }
}

Socket::~Socket() {
    Close();
}

/* Define all socket options that should not trigger a warning when set on
   a socket that is already bound/connected. */
void Socket::WarnUnlessImmediateOption(int32_t option) const {
    static const std::set<int32_t> immediate = {
        ZMQ_SUBSCRIBE,
        ZMQ_UNSUBSCRIBE,
        ZMQ_LINGER,
        ZMQ_ROUTER_MANDATORY,
        ZMQ_PROBE_ROUTER,
        ZMQ_XPUB_VERBOSE,
        ZMQ_REQ_CORRELATE,
        ZMQ_REQ_RELAXED,

#ifdef ZMQ_ROUTER_HANDOVER
        ZMQ_ROUTER_HANDOVER,
#endif

#ifdef ZMQ_XPUB_VERBOSER
        ZMQ_XPUB_VERBOSER,
#endif

#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4, 2, 0)
        /* As of 4.2.0 these options can take effect after bind/connect. */
        ZMQ_SNDHWM,
        ZMQ_RCVHWM,
#endif

        /* These take effect immediately due to our Node.js implementation. */
        ZMQ_SNDTIMEO,
        ZMQ_RCVTIMEO,
    };

    if (immediate.count(option) != 0) return;
    if (endpoints == 0 && state == State::Open) return;
    Warn(Env(), "Socket option will not take effect until next connect/bind");
}

bool Socket::ValidateOpen() const {
    if (state == State::Blocked) {
        ErrnoException(Env(), EBUSY).ThrowAsJavaScriptException();
        return false;
    }

    if (state == State::Closed) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return false;
    }

    return true;
}

bool Socket::HasEvents(int32_t requested) {
    int32_t events;
    size_t events_size = sizeof(events);

    while (zmq_getsockopt(socket, ZMQ_EVENTS, &events, &events_size) < 0) {
        /* Ignore errors. */
        if (zmq_errno() != EINTR) return 0;
    }

    return events & requested;
}

void Socket::Close() {
    if (socket != nullptr) {
        Napi::HandleScope scope(Env());

        /* Stop all polling and release event handlers. */
        poller.Reset();

        if (endpoints > 0) {
            Unref();
            endpoints = 0;
        }

        /* Close succeeds unless socket is invalid. */
        auto err = zmq_close(socket);
        assert(err == 0);

        /* Release reference to context and observer. */
        observer_ref.Reset();
        context_ref.Reset();

        state = State::Closed;
        socket = nullptr;
    }
}

void Socket::Send(const Napi::Promise::Deferred& res, const Napi::Array& msg) {
    auto last = msg.Length() - 1;
    for (uint32_t i = 0; i <= last; i++) {
        Outgoing part(msg[i]);

        uint32_t flags = i < last ? ZMQ_DONTWAIT | ZMQ_SNDMORE : ZMQ_DONTWAIT;
        while (zmq_msg_send(part, socket, flags) < 0) {
            if (zmq_errno() != EINTR) {
                res.Reject(ErrnoException(Env(), zmq_errno()).Value());
                return;
            }
        }
    }

    res.Resolve(Env().Undefined());
}

void Socket::Receive(const Napi::Promise::Deferred& res) {
    auto msg = Napi::Array::New(Env(), 1);

    uint32_t i = 0;
    while (true) {
        Incoming part;
        while (zmq_msg_recv(part, socket, ZMQ_DONTWAIT) < 0) {
            if (zmq_errno() != EINTR) {
                res.Reject(ErrnoException(Env(), zmq_errno()).Value());
                return;
            }
        }

        msg[i++] = part.ToBuffer(Env());
        if (!zmq_msg_more(part)) break;
    }

    res.Resolve(msg);
}

Napi::Value Socket::Bind(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Address must be a string", &Napi::Value::IsString},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    state = Socket::State::Blocked;
    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx =
        std::make_shared<AddressContext>(info[0].As<Napi::String>().Utf8Value());

    Work::Queue(
        [=]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_bind(socket, run_ctx->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    run_ctx->error = zmq_errno();
                    return;
                }
            }
        },
        [=]() {
            CallbackScope scope(Env());
            state = Socket::State::Open;

            if (request_close) {
                Close();
            }

            if (run_ctx->error != 0) {
                res.Reject(
                    ErrnoException(Env(), run_ctx->error, run_ctx->address).Value());
                return;
            }

            if (endpoints++ == 0) {
                Ref();
            }

            res.Resolve(Env().Undefined());
        });

    return res.Promise();
}

Napi::Value Socket::Unbind(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Address must be a string", &Napi::Value::IsString},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    state = Socket::State::Blocked;
    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx =
        std::make_shared<AddressContext>(info[0].As<Napi::String>().Utf8Value());

    Work::Queue(
        [=]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_unbind(socket, run_ctx->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    run_ctx->error = zmq_errno();
                    return;
                }
            }
        },
        [=]() {
            CallbackScope scope(Env());
            state = Socket::State::Open;

            if (request_close) {
                Close();
            }

            if (run_ctx->error != 0) {
                res.Reject(
                    ErrnoException(Env(), run_ctx->error, run_ctx->address).Value());
                return;
            }

            if (--endpoints == 0) {
                Unref();
            }

            res.Resolve(Env().Undefined());
        });

    return res.Promise();
}

void Socket::Connect(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Address must be a string", &Napi::Value::IsString},
    };

    if (!ValidateArguments(info, args)) return;
    if (!ValidateOpen()) return;

    std::string address = info[0].As<Napi::String>();
    if (zmq_connect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno(), address).ThrowAsJavaScriptException();
        return;
    }

    if (endpoints++ == 0) {
        Ref();
    }
}

void Socket::Disconnect(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Address must be a string", &Napi::Value::IsString},
    };

    if (!ValidateArguments(info, args)) return;
    if (!ValidateOpen()) return;

    std::string address = info[0].As<Napi::String>();
    if (zmq_disconnect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno(), address).ThrowAsJavaScriptException();
        return;
    }

    if (--endpoints == 0) {
        Unref();
    }
}

void Socket::Close(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;

    if (state == State::Blocked) {
        request_close = true;
    } else {
        request_close = false;
        Close();
    }
}

Napi::Value Socket::Send(const Napi::CallbackInfo& info) {
    auto args = {Argument{"Message must be present",
        [](const Napi::Value& value) { return !value.IsUndefined(); }}};

    if (!ValidateArguments(info, args)) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    Napi::Array parts;
    if (info[0].IsArray()) {
        parts = info[0].As<Napi::Array>();
    } else {
        parts = Napi::Array::New(Env(), 1);
        parts.Set(0u, info[0]);
    }

    if (send_timeout == 0 || HasEvents(ZMQ_POLLOUT)) {
        /* We can send on the socket immediately. This is a separate code
           path so we can avoid creating a lambda. */
        auto res = Napi::Promise::Deferred::New(Env());
        Send(res, parts);

        /* This operation may have caused a state change, so we must update
           the poller state manually! */
        poller.Trigger();

        return res.Promise();
    } else {
        /* Check if we are already polling for writes. If so that means
           two async read operations are started; which we do not allow.
           This is not laziness; we should not introduce additional queueing
           because it would break ZMQ semantics. */
        if (poller.PollingWritable()) {
            ErrnoException(Env(), EAGAIN).ThrowAsJavaScriptException();
            return Env().Undefined();
        }

        /* Async send. Capture any references by value because the lambda
           outlives the scope of this method. We wrap the message reference
           in a shared pointer, because references cannot be copied. :( */
        auto res = Napi::Promise::Deferred::New(Env());
        auto parts_ref =
            std::make_shared<Napi::Reference<Napi::Array>>(Napi::Persistent(parts));

        poller.PollWritable(send_timeout, [=]() {
            CallbackScope scope(Env());
            Send(res, parts_ref->Value());
        });

        return res.Promise();
    }
}

Napi::Value Socket::Receive(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    if (receive_timeout == 0 || HasEvents(ZMQ_POLLIN)) {
        /* We can read from the socket immediately. This is a separate code
           path so we can avoid creating a lambda. */
        auto res = Napi::Promise::Deferred::New(Env());
        Receive(res);

        /* This operation may have caused a state change, so we must update
           the poller state manually! */
        poller.Trigger();

        return res.Promise();
    } else {
        /* Check if we are already polling for reads. Only one promise may
           receive the next message, so we must ensure that receive
           operations are in sequence. */
        if (poller.PollingReadable()) {
            ErrnoException(Env(), EAGAIN).ThrowAsJavaScriptException();
            return Env().Undefined();
        }

        /* Async receive. Capture any references by value because the lambda
           outlives the scope of this method. */
        auto res = Napi::Promise::Deferred::New(Env());
        poller.PollReadable(receive_timeout, [=]() {
            CallbackScope scope(Env());
            Receive(res);
        });

        return res.Promise();
    }
}

template <>
Napi::Value Socket::GetSockOpt<bool>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = 0;
    size_t length = sizeof(value);
    if (zmq_getsockopt(socket, option, &value, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Boolean::New(Env(), value);
}

template <>
void Socket::SetSockOpt<bool>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a boolean", &Napi::Value::IsBoolean},
    };

    if (!ValidateArguments(info, args)) return;

    int32_t option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    int32_t value = info[1].As<Napi::Boolean>();
    if (zmq_setsockopt(socket, option, &value, sizeof(value)) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <>
Napi::Value Socket::GetSockOpt<char*>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    char value[1024];
    size_t length = sizeof(value) - 1;
    if (zmq_getsockopt(socket, option, value, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (length == 0 || (length == 1 && value[0] == 0)) {
        return Env().Null();
    } else {
        value[length] = '\0';
        return Napi::String::New(Env(), value);
    }
}

template <>
void Socket::SetSockOpt<char*>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a string or buffer", &Napi::Value::IsString,
            &Napi::Value::IsBuffer, &Napi::Value::IsNull},
    };

    if (!ValidateArguments(info, args)) return;

    int32_t option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    int32_t err;
    if (info[1].IsBuffer()) {
        Napi::Object buf = info[1].As<Napi::Object>();
        auto length = buf.As<Napi::Buffer<char>>().Length();
        auto value = buf.As<Napi::Buffer<char>>().Data();
        err = zmq_setsockopt(socket, option, value, length);
    } else if (info[1].IsString()) {
        std::string str = info[1].As<Napi::String>();
        auto length = str.length();
        auto value = str.data();
        err = zmq_setsockopt(socket, option, value, length);
    } else {
        auto length = 0u;
        auto value = nullptr;
        err = zmq_setsockopt(socket, option, value, length);
    }

    if (err < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <typename T>
Napi::Value Socket::GetSockOpt(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    T value = 0;
    size_t length = sizeof(value);
    if (zmq_getsockopt(socket, option, &value, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Number::New(Env(), static_cast<double>(value));
}

template <typename T>
void Socket::SetSockOpt(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return;

    int32_t option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    T value = number_cast<T>(info[1].As<Napi::Number>());
    if (zmq_setsockopt(socket, option, &value, sizeof(value)) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    /* Mirror a few options that are used internally. */
    switch (option) {
        case ZMQ_SNDTIMEO:
            send_timeout = value;
            break;
        case ZMQ_RCVTIMEO:
            receive_timeout = value;
            break;
    }
}

Napi::Value Socket::GetEvents(const Napi::CallbackInfo& info) {
    /* Reuse the same observer object every time it is accessed. */
    if (observer_ref.IsEmpty()) {
        observer_ref.Reset(Observer::Constructor.New({Value()}), 1);
    }

    return observer_ref.Value();
}

Napi::Value Socket::GetContext(const Napi::CallbackInfo& info) {
    return context_ref.Value();
}

Napi::Value Socket::GetClosed(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(Env(), state == State::Closed);
}

Napi::Value Socket::GetReadable(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLIN));
}

Napi::Value Socket::GetWritable(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLOUT));
}

void Socket::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("bind", &Socket::Bind), InstanceMethod("unbind", &Socket::Unbind),

        InstanceMethod("connect", &Socket::Connect),
        InstanceMethod("disconnect", &Socket::Disconnect),

        InstanceMethod("close", &Socket::Close),

        InstanceMethod("send", &Socket::Send),
        InstanceMethod("receive", &Socket::Receive),

        InstanceMethod("getBoolOption", &Socket::GetSockOpt<bool>),
        InstanceMethod("setBoolOption", &Socket::SetSockOpt<bool>),
        InstanceMethod("getInt32Option", &Socket::GetSockOpt<int32_t>),
        InstanceMethod("setInt32Option", &Socket::SetSockOpt<int32_t>),
        InstanceMethod("getUInt32Option", &Socket::GetSockOpt<uint32_t>),
        InstanceMethod("setUInt32Option", &Socket::SetSockOpt<uint32_t>),
        InstanceMethod("getInt64Option", &Socket::GetSockOpt<int64_t>),
        InstanceMethod("setInt64Option", &Socket::SetSockOpt<int64_t>),
        InstanceMethod("getUInt64Option", &Socket::GetSockOpt<uint64_t>),
        InstanceMethod("setUInt64Option", &Socket::SetSockOpt<uint64_t>),
        InstanceMethod("getStringOption", &Socket::GetSockOpt<char*>),
        InstanceMethod("setStringOption", &Socket::SetSockOpt<char*>),

        InstanceAccessor("events", &Socket::GetEvents, nullptr),
        InstanceAccessor("context", &Socket::GetContext, nullptr),

        InstanceAccessor("closed", &Socket::GetClosed, nullptr),
        InstanceAccessor("readable", &Socket::GetReadable, nullptr),
        InstanceAccessor("writable", &Socket::GetWritable, nullptr),
    };

    auto constructor = DefineClass(env, "Socket", proto);

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Socket", constructor);
}
}
