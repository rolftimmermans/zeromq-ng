/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "binding.h"

namespace zmq {
class IncomingMsg {
public:
    IncomingMsg();
    ~IncomingMsg();

    Napi::Value ToBuffer(const Napi::Env& env);

    inline operator zmq_msg_t*() {
        return *ref;
    }

private:
    class Reference {
        zmq_msg_t msg;

    public:
        Reference();
        ~Reference();

        inline operator zmq_msg_t*() {
            return &msg;
        }
    };

    Napi::ObjectReference buf;
    Reference* ref = nullptr;
};
}
