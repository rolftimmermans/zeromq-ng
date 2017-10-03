/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

namespace zmq {
    class Argument {
        typedef bool (Napi::Value::*ArgumentValidationCallback)() const;

        std::function<bool(const Napi::Value&)> fn;
        const std::string& msg;

    public:
        inline Argument(const std::string& msg, std::function<bool(const Napi::Value&)> fn)
          : fn(fn), msg(msg) {}

        inline Argument(const std::string& msg, std::initializer_list<ArgumentValidationCallback> fns)
          : fn([fns](const Napi::Value& value) {
            for (const auto& fn : fns) {
                if ((value.*fn)()) return true;
            }
            return false;
        }), msg(msg) {}

        inline const std::string& Message() const {
            return msg;
        }

        inline bool Valid(const Napi::Value& arg) const {
            return fn(arg);
        }
    };

    inline bool ValidateArguments(const Napi::CallbackInfo& info, std::initializer_list<Argument> args) {
        for (const auto& arg : args) {
            auto i = &arg - args.begin();

            if (!arg.Valid(info[i])) {
                Napi::TypeError::New(info.Env(), arg.Message()).ThrowAsJavaScriptException();
                return false;
            }
        }

        if (info.Length() > args.size()) {
            auto msg = "Expected " + std::to_string(args.size()) + " argument" + (args.size() != 0 ? "s" : "");
            Napi::TypeError::New(info.Env(), msg).ThrowAsJavaScriptException();
            return false;
        }

        return true;
    }
}
