/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include "uvhandle.h"

#include <atomic>
#include <memory>
#include <mutex>
#include <vector>

namespace zmq {
class Outgoing {
    /* Container for unused references to outgoing messages. Once an item is
       added to the trash it will be cleared on the main thread once UV decides
       to call the async callback. This is required because v8 objects cannot
       be released on other threads. */
    template <typename T>
    class Trash {
        std::vector<std::unique_ptr<T>> values;
        std::mutex lock;
        UvHandle<uv_async_t> async;

    public:
        /* Construct trash with an associated asynchronous callback. */
        inline Trash() {
            async->data = this;
            auto err = uv_async_init(uv_default_loop(), async, [](uv_async_t* async) {
                reinterpret_cast<Trash*>(async->data)->Clear();
            });

            assert(err == 0);
        }

        /* Add given item to the trash, marking it for deletion next time the
           async callback is called by UV. */
        inline void Add(T* item) {
            {
                std::lock_guard<std::mutex> guard(lock);
                values.emplace_back(std::unique_ptr<T>(std::move(item)));
            }

            /* Call to uv_async_send() should never return nonzero. UV ensures
               that calls are coalesced if they occur frequently. This is good
               news for us, since that means frequent additions do not cause
               unnecessary trash cycle operations. */
            auto err = uv_async_send(trash.async);
            assert(err == 0);
        }

        inline void Clear() {
            std::lock_guard<std::mutex> guard(lock);
            values.clear();
        }
    };

    class Reference {
        Napi::Reference<Napi::Value> persistent;

    public:
        inline explicit Reference(Napi::Value val) : persistent(Napi::Persistent(val)) {}
    };

    static auto constexpr zeroCopyThreshold = 32;

    static Trash<Reference> trash;
    static inline void Recycle(void*, void* item) {
        trash.Add(static_cast<Reference*>(item));
    }

    zmq_msg_t msg;

public:
    /* Outgoing message. Takes a string or buffer argument and releases
       the underlying V8 resources whenever the message is sent, or earlier
       if the message was copied (small buffers & strings). */
    inline Outgoing(Napi::Value value) {
        if (value.IsBuffer()) {
            auto buf = value.As<Napi::Buffer<uint8_t>>();
            auto length = buf.Length();
            auto data = buf.Data();

            /* Zero-copy heuristic. There's an overhead in releasing the
               buffer with an async call to the main thread (v8 is not
               threadsafe), so copying small amounts of memory is faster
               than releasing the initial buffer asynchronously. */
            if (length > zeroCopyThreshold) {
                auto ref = new Reference(value);
                if (zmq_msg_init_data(&msg, data, length, Recycle, ref) < 0) {
                    delete ref;
                    ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                    return;
                }
            } else {
                if (zmq_msg_init_size(&msg, length) < 0) {
                    ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                    return;
                }

                std::copy(data, data + length, static_cast<uint8_t*>(zmq_msg_data(&msg)));
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
                ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
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

Outgoing::Trash<Outgoing::Reference> Outgoing::trash;
}
