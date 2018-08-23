/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "../binding.h"

#include "outgoing.h"

namespace zmq {
Trash<Outgoing::Reference> Outgoing::trash;

Outgoing::Outgoing(Napi::Value value) {
    if (value.IsBuffer()) {
        auto buf = value.As<Napi::Buffer<uint8_t>>();
        auto length = buf.Length();
        auto data = buf.Data();

        /* Zero-copy heuristic. There's an overhead in releasing the buffer with an
           async call to the main thread (v8 is not threadsafe), so copying small
           amounts of memory is faster than releasing the initial buffer
           asynchronously. */
        static auto constexpr zero_copy_threshold = 32;
        if (length > zero_copy_threshold) {
            auto ref = new Reference(value);
            auto recycle = [](void*, void* item) {
                trash.Add(static_cast<Reference*>(item));
            };

            if (zmq_msg_init_data(&msg, data, length, recycle, ref) < 0) {
                /* Initialisation failed, so the recycle callback is not called and we
                   have to clean up the reference manually. */
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

Outgoing::~Outgoing() {
    auto err = zmq_msg_close(&msg);
    assert(err == 0);
}
}
