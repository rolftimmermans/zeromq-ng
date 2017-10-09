/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "uvhandle.h"

namespace zmq {
class Outgoing {
    /* Persistent reference to a V8 value that allows asynchronous
       destruction by using uv_async. */
    class Reference {
        Napi::Reference<Napi::Value> persistent;
        UvHandle<uv_async_t> async;

    public:
        inline Reference(Napi::Value value)
            : persistent(Napi::Persistent(value)) {
            async->data = this;

            /* Can fail if we run out of file descriptors. */
            int32_t err =
                uv_async_init(uv_default_loop(), async, [](uv_async_t* async) {
                    delete reinterpret_cast<Reference*>(async->data);
                });

            if (err != 0) {
                ErrnoException(value.Env(), err).ThrowAsJavaScriptException();
                return;
            }
        }

        static void Release(void*, void* ref) {
            /* Call to uv_async_send() should never return nonzero. */
            auto err = uv_async_send(static_cast<Reference*>(ref)->async);
            assert(err == 0);
        }
    };

    zmq_msg_t msg;

    static auto constexpr zeroCopyThreshold = 128;

public:
    /* Outgoing message. Takes a string or buffer argument and releases
       the underlying V8 resources whenever the message is sent, or earlier
       if the message was copied (small buffers & strings). */
    inline Outgoing(Napi::Value value) {
        if (value.IsBuffer()) {
            auto buf = value.As<Napi::Buffer<char>>();
            auto length = buf.Length();
            auto data = buf.Data();

            /* Zero-copy heuristic. There's an overhead in releasing the
               buffer with an async call to the main thread (v8 is not
               threadsafe), so copying small amounts of memory may be faster
               than releasing the initial buffer asynchronously. */
            if (length > zeroCopyThreshold) {
                auto ref = new Reference(value);
                if (zmq_msg_init_data(&msg, data, length, ref->Release, ref)
                    < 0) {
                    delete ref;
                    ErrnoException(value.Env(), zmq_errno())
                        .ThrowAsJavaScriptException();
                    return;
                }
            } else {
                if (zmq_msg_init_size(&msg, length) < 0) {
                    ErrnoException(value.Env(), zmq_errno())
                        .ThrowAsJavaScriptException();
                    return;
                }

                std::copy(
                    data, data + length, static_cast<char*>(zmq_msg_data(&msg)));
            }
        } else {
            /* String data should first be converted to UTF-8 before we
               can send it; but once converted we do not have to copy a
               second time. */
            auto str = new std::string(
                value.IsString() ? value.As<Napi::String>() : value.ToString());
            auto length = str->size();
            auto data = const_cast<char*>(str->data());

            auto release = [](void*, void* str) {
                delete reinterpret_cast<std::string*>(str);
            };

            if (zmq_msg_init_data(&msg, data, length, release, str) < 0) {
                ErrnoException(value.Env(), zmq_errno())
                    .ThrowAsJavaScriptException();
                return;
            }
        }
    }

    inline ~Outgoing() {
        auto err = zmq_msg_close(&msg);
        assert(err == 0);
    }

    inline operator zmq_msg_t*() {
        return &msg;
    }
};
}
