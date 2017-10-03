/* Copyright (c) 2017 Rolf Timmermans */
#include "context.h"
#include "socket.h"

Napi::Object init(Napi::Env env, Napi::Object exports) {
    exports.Set("version", [&]() {
        int32_t major, minor, patch;
        zmq_version(&major, &minor, &patch);

        return Napi::String::New(env,
            std::to_string(major) + "." +
            std::to_string(minor) + "." +
            std::to_string(patch)
        );
    }());

    exports.Set("capability", [&]() {
        static auto options = {"ipc", "pgm", "tipc", "norm", "curve", "gssapi", "draft"};

        auto result = Napi::Object::New(env);

#ifdef ZMQ_HAS_CAPABILITIES
        for (auto& option : options) {
            result.Set(option, static_cast<bool>(zmq_has(option)));
        }
#endif

        return result;
    }());

    zmq::Context::Initialize(env, exports);
    zmq::Socket::Initialize(env, exports);

    return exports;
}

NODE_API_MODULE(zmq, init)
