/* Copyright (c) 2017-2018 Rolf Timmermans */
#include "incoming_msg.h"

namespace zmq {
IncomingMsg::IncomingMsg() : ref(new Reference()) {}

IncomingMsg::~IncomingMsg() {
    if (buf.IsEmpty() && ref != nullptr) {
        delete ref;
        ref = nullptr;
    }
};

Napi::Value IncomingMsg::ToBuffer(const Napi::Env& env) {
    if (buf.IsEmpty()) {
        Napi::Object msg = Napi::Buffer<uint8_t>::New(env,
            reinterpret_cast<uint8_t*>(zmq_msg_data(*ref)), zmq_msg_size(*ref),
            [](const Napi::Env& env, uint8_t*, Reference* ref) { delete ref; }, ref);

        if (msg.IsEmpty()) {
            return env.Null();
        }

        buf = Napi::Persistent(msg);
    }

    return buf.Value();
}

IncomingMsg::Reference::Reference() {
    auto err = zmq_msg_init(&msg);
    assert(err == 0);
}

IncomingMsg::Reference::~Reference() {
    auto err = zmq_msg_close(&msg);
    assert(err == 0);
}
}
