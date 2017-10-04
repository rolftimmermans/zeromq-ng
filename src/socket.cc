/* Copyright (c) 2017 Rolf Timmermans */
#include "socket.h"
#include "context.h"

#include "inline/work.h"
#include "inline/incoming.h"
#include "inline/outgoing.h"
#include "inline/v8hacks.h"

#include <set>

namespace zmq {
    struct AddressContext {
        std::string address;
        uint32_t error = 0;

    public:
        AddressContext(std::string&& address) : address(std::move(address)) {}
    };

    Socket::Socket(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<Socket>(info) {

        if (!ValidateArguments(info, {
            Argument{"Socket type must be a number", {&Napi::Value::IsNumber}},
            Argument{"Options must be an object", {&Napi::Value::IsObject, &Napi::Value::IsUndefined}},
        })) return;

        auto type = info[0].As<Napi::Number>().Int32Value();

        if (info[1].IsObject()) {
            auto options = info[1].As<Napi::Object>();
            if (options.Has("context")) {
                context.Reset(options.Get("context").As<Napi::Object>(), 1);
                options.Delete("context");
            } else {
                context.Reset(GlobalContext.Value(), 1);
            }
        } else {
            context.Reset(GlobalContext.Value(), 1);
        }

        auto ctxobj = Context::Unwrap(context.Value());
        if (Env().IsExceptionPending()) return;

        socket = zmq_socket(ctxobj->context, type);
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

        auto err = poller.Init(fd);
        if (err != 0) {
            ErrnoException(Env(), err).ThrowAsJavaScriptException();
            return;
        }

        poller.SetReadableValidate(std::bind(&Socket::HasEvents, this, ZMQ_POLLIN));
        poller.SetWritableValidate(std::bind(&Socket::HasEvents, this, ZMQ_POLLOUT));

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
            ZMQ_SUBSCRIBE, ZMQ_UNSUBSCRIBE,
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

#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4,2,0)
            /* As of 4.2.0 these options can take effect after bind/connect. */
            ZMQ_SNDHWM, ZMQ_RCVHWM,
#endif

            /* These take effect immediately due to our Node.js implementation. */
            ZMQ_SNDTIMEO, ZMQ_RCVTIMEO,
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

    bool Socket::ValidateNotBlocked() const {
        if (state == State::Blocked) {
            ErrnoException(Env(), EAGAIN).ThrowAsJavaScriptException();
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

    bool Socket::Close() {
        if (socket != nullptr) {
            Napi::HandleScope scope(Env());

            /* Stop all polling and release event handlers. */
            poller.Reset();

            if (endpoints > 0) {
                Unref();
                endpoints = 0;
            }

            if (zmq_close(socket) < 0) {
                return false;
            }

            /* Release reference to context. */
            context.Reset();

            socket = nullptr;
            state = State::Closed;
        }

        return true;
    }

    void Socket::Send(const Napi::Promise::Resolver& resolver, const Napi::Array& msg) {
        auto last = msg.Length() - 1;
        for (uint32_t i = 0; i <= last; i++) {
            Outgoing part(msg[i]);

            uint32_t flags = i < last ? ZMQ_DONTWAIT | ZMQ_SNDMORE : ZMQ_DONTWAIT;
            while (zmq_msg_send(part, socket, flags) < 0) {
                if (zmq_errno() != EINTR) {
                    resolver.Reject(ErrnoException(Env(), zmq_errno()).Value());
                    return;
                }
            }
        }

        resolver.Resolve(Env().Undefined());
    }

    void Socket::Receive(const Napi::Promise::Resolver& resolver) {
        auto msg = Napi::Array::New(Env(), 1);

        uint32_t i = 0;
        while (true) {
            Incoming part;
            while (zmq_msg_recv(part, socket, ZMQ_DONTWAIT) < 0) {
                if (zmq_errno() != EINTR) {
                    resolver.Reject(ErrnoException(Env(), zmq_errno()).Value());
                    return;
                }
            }

            msg[i++] = part.ToBuffer(Env());
            if (!zmq_msg_more(part)) break;
        }

        resolver.Resolve(msg);
    }

    Napi::Value Socket::Bind(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Address must be a string", {&Napi::Value::IsString}},
        })) return Env().Undefined();

        if (!ValidateOpen()) return Env().Undefined();

        state = Socket::State::Blocked;
        auto resolver = Napi::Promise::Resolver::New(Env());
        auto context = std::make_shared<AddressContext>(
            info[0].As<Napi::String>().Utf8Value()
        );

        Work::Queue([=]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_bind(socket, context->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    context->error = zmq_errno();
                    return;
                }
            }
        }, [=]() {
            V8CallbackScope scope;
            state = Socket::State::Open;

            if (context->error != 0) {
                resolver.Reject(ErrnoException(Env(), context->error, context->address).Value());
                return;
            }

            if (endpoints++ == 0) {
                Ref();
            }

            resolver.Resolve(Env().Undefined());
        });

        return resolver.Promise();
    }

    Napi::Value Socket::Unbind(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Address must be a string", {&Napi::Value::IsString}},
        })) return Env().Undefined();

        if (!ValidateOpen()) return Env().Undefined();

        state = Socket::State::Blocked;
        auto resolver = Napi::Promise::Resolver::New(Env());
        auto context = std::make_shared<AddressContext>(
            info[0].As<Napi::String>().Utf8Value()
        );

        Work::Queue([=]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_unbind(socket, context->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    context->error = zmq_errno();
                    return;
                }
            }
        }, [=]() {
            V8CallbackScope scope;
            state = Socket::State::Open;

            if (context->error != 0) {
                resolver.Reject(ErrnoException(Env(), context->error, context->address).Value());
                return;
            }

            if (--endpoints == 0) {
                Unref();
            }

            resolver.Resolve(Env().Undefined());
        });

        return resolver.Promise();
    }

    void Socket::Connect(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Address must be a string", {&Napi::Value::IsString}},
        })) return;

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
        if (!ValidateArguments(info, {
            Argument{"Address must be a string", {&Napi::Value::IsString}},
        })) return;

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
        if (!ValidateNotBlocked()) return;

        if (!Close()) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        }
    }

    Napi::Value Socket::Send(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{
                "Message must be present",
                [](const Napi::Value& value) { return !value.IsUndefined(); }
            }
        })) return Env().Undefined();

        if (!ValidateOpen()) return Env().Undefined();

        Napi::Array msg;
        if (info[0].IsArray()) {
            msg = info[0].As<Napi::Array>();
        } else {
            msg = Napi::Array::New(Env(), 1);
            msg.Set(static_cast<int32_t>(0), info[0]);
        }

        if (send_timeout == 0 || HasEvents(ZMQ_POLLOUT)) {
            /* We can send on the socket immediately. This is a separate code
               path so we can avoid creating a lambda. */
            auto resolver = Napi::Promise::Resolver::New(Env());
            Send(resolver, msg);

            /* This operation may have caused a state change, so we must update
               the poller state manually! */
            poller.Trigger();

            return resolver.Promise();
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
            auto resolver = Napi::Promise::Resolver::New(Env());
            auto msgp = std::make_shared<Napi::Reference<Napi::Array>>(Napi::Persistent(msg));
            poller.PollWritable(send_timeout, [=]() {
                V8CallbackScope scope;
                Send(resolver, msgp->Value());
            });

            return resolver.Promise();
        }
    }

    Napi::Value Socket::Receive(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {})) return Env().Undefined();
        if (!ValidateOpen()) return Env().Undefined();

        if (receive_timeout == 0 || HasEvents(ZMQ_POLLIN)) {
            /* We can read from the socket immediately. This is a separate code
               path so we can avoid creating a lambda. */
            auto resolver = Napi::Promise::Resolver::New(Env());
            Receive(resolver);

            /* This operation may have caused a state change, so we must update
               the poller state manually! */
            poller.Trigger();

            return resolver.Promise();
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
            auto resolver = Napi::Promise::Resolver::New(Env());
            poller.PollReadable(receive_timeout, [=]() {
                V8CallbackScope scope;
                Receive(resolver);
            });

            return resolver.Promise();
        }
    }

    template<>
    Napi::Value Socket::GetSockOpt<bool>(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Option identifier must be a number", {&Napi::Value::IsNumber}},
        })) return Env().Undefined();

        uint32_t option = info[0].As<Napi::Number>();

        int32_t value = 0;
        size_t length = sizeof(value);
        if (zmq_getsockopt(socket, option, &value, &length) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return Env().Undefined();
        }

        return Napi::Boolean::New(Env(), value);
    }

    template<>
    void Socket::SetSockOpt<bool>(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Option identifier must be a number", {&Napi::Value::IsNumber}},
            Argument{"Option value must be a boolean", {&Napi::Value::IsBoolean}},
        })) return;

        int32_t option = info[0].As<Napi::Number>();
        WarnUnlessImmediateOption(option);

        int32_t value = info[1].As<Napi::Boolean>();
        if (zmq_setsockopt(socket, option, &value, sizeof(value)) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }
    }

    template<>
    Napi::Value Socket::GetSockOpt<char*>(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Option identifier must be a number", {&Napi::Value::IsNumber}},
        })) return Env().Undefined();

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

    template<>
    void Socket::SetSockOpt<char*>(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{
                "Option identifier must be a number",
                {&Napi::Value::IsNumber}
            },
            Argument{
                "Option value must be a string or buffer",
                {&Napi::Value::IsString, &Napi::Value::IsBuffer, &Napi::Value::IsNull}
            },
        })) return;

        int32_t option = info[0].As<Napi::Number>();
        WarnUnlessImmediateOption(option);


        size_t length = 0;
        const char* value = nullptr;

        if (info[1].IsBuffer()) {
            Napi::Object buf = info[1].As<Napi::Object>();
            length = buf.As<Napi::Buffer<char>>().Length();
            value = buf.As<Napi::Buffer<char>>().Data();
        } else if (info[1].IsString()) {
            std::string str = info[1].As<Napi::String>();
            length = str.length();
            value = str.data();
        } else {
            length = 0;
            value = nullptr;
        }

        if (zmq_setsockopt(socket, option, value, length) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }
    }

    template<typename T>
    Napi::Value Socket::GetSockOpt(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Option identifier must be a number", {&Napi::Value::IsNumber}},
        })) return Env().Undefined();

        uint32_t option = info[0].As<Napi::Number>();

        T value = 0;
        size_t length = sizeof(value);
        if (zmq_getsockopt(socket, option, &value, &length) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return Env().Undefined();
        }

        return Napi::Number::New(Env(), value);
    }

    template<typename T>
    void Socket::SetSockOpt(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {
            Argument{"Option identifier must be a number", {&Napi::Value::IsNumber}},
            Argument{"Option value must be a number", {&Napi::Value::IsNumber}},
        })) return;

        int32_t option = info[0].As<Napi::Number>();
        WarnUnlessImmediateOption(option);

        T value = info[1].As<Napi::Number>();
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

    Napi::Value Socket::GetClosed(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {})) return Env().Undefined();
        return Napi::Boolean::New(Env(), state == State::Closed);
    }

    Napi::Value Socket::GetContext(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {})) return Env().Undefined();
        return context.Value();
    }

    Napi::Value Socket::GetReadable(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {})) return Env().Undefined();
        return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLIN));
    }

    Napi::Value Socket::GetWritable(const Napi::CallbackInfo& info) {
        if (!ValidateArguments(info, {})) return Env().Undefined();
        return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLOUT));
    }

    void Socket::Initialize(Napi::Env env, Napi::Object exports) {
        auto constructor = DefineClass(env, "Socket", {
            InstanceMethod("bind", &Socket::Bind),
            InstanceMethod("unbind", &Socket::Unbind),

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
            // InstanceMethod("getUInt64Option", &Socket::GetSockOpt<uint64_t>),
            // InstanceMethod("setUInt64Option", &Socket::SetSockOpt<uint64_t>),
            InstanceMethod("getStringOption", &Socket::GetSockOpt<char*>),
            InstanceMethod("setStringOption", &Socket::SetSockOpt<char*>),

            InstanceAccessor("closed", &Socket::GetClosed, nullptr),
            InstanceAccessor("context", &Socket::GetContext, nullptr),

            InstanceAccessor("readable", &Socket::GetReadable, nullptr),
            InstanceAccessor("writable", &Socket::GetWritable, nullptr),
        });

        exports.Set("Socket", constructor);
    }
}
