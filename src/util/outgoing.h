/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include "trash.h"

#include <forward_list>

namespace zmq {
class Outgoing {
    class Reference {
        Napi::Reference<Napi::Value> persistent;

    public:
        inline explicit Reference(Napi::Value val) : persistent(Napi::Persistent(val)) {}
    };

    static Trash<Reference> trash;

    zmq_msg_t msg;

    /* Avoid copying outgoing messages, since the destructor is not copy safe,
       nor should we have to copy messages with the right STL containers. */
    Outgoing(const Outgoing&) = delete;
    Outgoing& operator=(const Outgoing&) = delete;

public:
    /* Outgoing message. Takes a string or buffer argument and releases
       the underlying V8 resources whenever the message is sent, or earlier
       if the message was copied (small buffers & strings). */

    explicit Outgoing(Napi::Value value);
    ~Outgoing();

    inline operator zmq_msg_t*() {
        return &msg;
    }
};

class OutgoingParts {
    std::forward_list<Outgoing> parts;

public:
    inline OutgoingParts() {}

    inline explicit OutgoingParts(Napi::Value value) {
        if (value.IsArray()) {
            /* Reverse insert parts into outgoing message list. */
            auto arr = value.As<Napi::Array>();
            for (auto i = arr.Length(); i--;) {
                parts.emplace_front(arr[i]);
            }
        } else {
            parts.emplace_front(value);
        }
    }

    inline std::forward_list<Outgoing>::iterator begin() {
        return parts.begin();
    }

    inline std::forward_list<Outgoing>::iterator end() {
        return parts.end();
    }

    inline void clear() {
        parts.clear();
    }
};
}
