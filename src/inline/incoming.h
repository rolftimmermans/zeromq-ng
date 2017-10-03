/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

namespace zmq {
    class Incoming {
        class Reference {
            zmq_msg_t msg;

        public:
            inline Reference() {
                auto err = zmq_msg_init(&msg);
                assert(err == 0);
            }

            inline ~Reference() {
                auto err = zmq_msg_close(&msg);
                assert(err == 0);
            }

            inline operator zmq_msg_t*() {
                return &msg;
            }
        };

        Napi::ObjectReference buf;
        Reference* ref = nullptr;

    public:
        inline Incoming()
            : ref(new Reference()) {}

        inline ~Incoming() {
            if (buf.IsEmpty() && ref != nullptr) {
                delete ref;
                ref = nullptr;
            }
        };

        inline operator zmq_msg_t*() {
            return *ref;
        }

        inline Napi::Value ToBuffer(const Napi::Env& env) {
            if (buf.IsEmpty()) {
                Napi::Object msg = Napi::Buffer<uint8_t>::New(
                    env,
                    reinterpret_cast<uint8_t*>(zmq_msg_data(*ref)),
                    zmq_msg_size(*ref),
                    [](const Napi::Env& env, uint8_t*, Reference* ref) {
                        delete ref;
                    },
                    ref
                );

                if (msg.IsEmpty()) {
                    return env.Null();
                }

                buf = Napi::Persistent(msg);
            }

            return buf.Value();
        }
    };
}
