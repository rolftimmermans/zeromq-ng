/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "observer.h"
#include "context.h"
#include "inline/callback_scope.h"
#include "socket.h"

#include "inline/incoming.h"

#include <array>

namespace zmq {
Napi::FunctionReference Observer::Constructor;

template <typename T, typename... N>
auto constexpr make_array(N&&... args) -> std::array<T, sizeof...(args)> {
    return {{std::forward<N>(args)...}};
}

static auto events = make_array<const char*>(
#ifdef ZMQ_EVENT_CONNECTED
    "connect",
#endif
#ifdef ZMQ_EVENT_CONNECT_DELAYED
    "connectDelay",
#endif
#ifdef ZMQ_EVENT_CONNECT_RETRIED
    "connectRetry",
#endif
#ifdef ZMQ_EVENT_LISTENING
    "listening",
#endif
#ifdef ZMQ_EVENT_BIND_FAILED
    "bindError",
#endif
#ifdef ZMQ_EVENT_ACCEPTED
    "accept",
#endif
#ifdef ZMQ_EVENT_ACCEPT_FAILED
    "acceptError",
#endif
#ifdef ZMQ_EVENT_CLOSED
    "close",
#endif
#ifdef ZMQ_EVENT_CLOSE_FAILED
    "closeError",
#endif
#ifdef ZMQ_EVENT_DISCONNECTED
    "disconnect",
#endif
#ifdef ZMQ_EVENT_MONITOR_STOPPED
    "stop",
#endif
    "unknown");

/* https://stackoverflow.com/questions/757059/position-of-least-significant-bit-that-is-set
 */
static inline const char* EventName(uint32_t val) {
    static const int multiply[32] = {0, 1, 28, 2, 29, 14, 24, 3, 30, 22, 20, 15, 25, 17,
        4, 8, 31, 27, 13, 23, 21, 19, 16, 7, 26, 12, 18, 6, 11, 5, 10, 9};

    uint32_t ffs = multiply[((uint32_t)((val & -val) * 0x077CB531U)) >> 27];

    if (ffs >= events.size()) return events.back();
    return events[ffs];
}

Observer::Observer(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Observer>(info) {
    auto args = {
        Argument{"Socket must be a socket object", &Napi::Value::IsObject},
    };

    if (!ValidateArguments(info, args)) return;

    auto target = Socket::Unwrap(info[0].As<Napi::Object>());
    if (Env().IsExceptionPending()) return;

    /* Use `this` pointer as unique identifier for monitoring socket. */
    auto address = std::string("inproc://zmq.monitor.")
        + to_string(reinterpret_cast<uintptr_t>(this));

    if (zmq_socket_monitor(target->socket, address.c_str(), ZMQ_EVENT_ALL) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    auto context = Context::Unwrap(target->context_ref.Value());
    socket = zmq_socket(context->context, ZMQ_PAIR);
    if (socket == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    if (zmq_connect(socket, address.c_str()) < 0) {
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

    poller.ValidateReadable(std::bind(&Observer::HasEvents, this));
}

Observer::~Observer() {
    Close();
}

bool Observer::ValidateOpen() const {
    if (socket == nullptr) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return false;
    }

    return true;
}

bool Observer::HasEvents() {
    int32_t events;
    size_t events_size = sizeof(events);

    while (zmq_getsockopt(socket, ZMQ_EVENTS, &events, &events_size) < 0) {
        /* Ignore errors. */
        if (zmq_errno() != EINTR) return 0;
    }

    return events & ZMQ_POLLIN;
}

void Observer::Close() {
    if (socket != nullptr) {
        Napi::HandleScope scope(Env());

        /* Close succeeds unless socket is invalid. */
        auto err = zmq_close(socket);
        assert(err == 0);

        socket = nullptr;

        /* Stop all polling and release event handlers. Callling this after
           setting socket to null causes a pending receive promise to be
           resolved with undefined. */
        poller.Reset();
    }
}

void Observer::Receive(const Napi::Promise::Deferred& res) {
    zmq_msg_t msg1;
    zmq_msg_t msg2;

    zmq_msg_init(&msg1);
    while (zmq_msg_recv(&msg1, socket, ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            res.Reject(ErrnoException(Env(), zmq_errno()).Value());
            zmq_msg_close(&msg1);
            return;
        }
    }

    auto data1 = static_cast<uint8_t*>(zmq_msg_data(&msg1));
    auto event_id = *reinterpret_cast<uint16_t*>(data1);
    auto event_value = *reinterpret_cast<uint32_t*>(data1 + 2);
    zmq_msg_close(&msg1);

    zmq_msg_init(&msg2);
    while (zmq_msg_recv(&msg2, socket, ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            res.Reject(ErrnoException(Env(), zmq_errno()).Value());
            zmq_msg_close(&msg2);
            return;
        }
    }

    auto data2 = reinterpret_cast<char*>(zmq_msg_data(&msg2));
    auto length = zmq_msg_size(&msg2);

    auto details = Napi::Object::New(Env());
    if (length > 0) {
        details["address"] = Napi::String::New(Env(), data2, length);
    }

    zmq_msg_close(&msg2);

    switch (event_id) {
        case ZMQ_EVENT_CONNECT_RETRIED:
            details["reconnectInterval"] = Napi::Number::New(Env(), event_value);
            break;
        case ZMQ_EVENT_BIND_FAILED:
        case ZMQ_EVENT_ACCEPT_FAILED:
        case ZMQ_EVENT_CLOSE_FAILED:
            details["error"] = ErrnoException(Env(), event_value).Value();
            break;
        case ZMQ_EVENT_MONITOR_STOPPED:
            /* Also close the monitoring socket. */
            Close();
            break;
    }

    auto msg = Napi::Array::New(Env(), 1);
    msg[0u] = Napi::String::New(Env(), EventName(event_id));
    msg[1u] = details;
    res.Resolve(msg);
}

void Observer::Close(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;

    Close();
}

Napi::Value Observer::Receive(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    if (HasEvents()) {
        /* We can read from the socket immediately. This is a separate code
           path so we can avoid creating a lambda. */
        auto res = Napi::Promise::Deferred::New(Env());
        Receive(res);
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
        poller.PollReadable(0, [=]() {
            CallbackScope scope(Env());
            Receive(res);
        });

        return res.Promise();
    }
}

Napi::Value Observer::GetClosed(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(Env(), socket == nullptr);
}

void Observer::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("close", &Observer::Close),
        InstanceMethod("receive", &Observer::Receive),
        InstanceAccessor("closed", &Observer::GetClosed, nullptr),
    };

    auto constructor = DefineClass(env, "Observer", proto);

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Observer", constructor);
}
}
