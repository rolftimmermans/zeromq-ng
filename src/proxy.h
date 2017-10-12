/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "binding.h"
#include "inline/poller.h"

namespace zmq {
class Proxy : public Napi::ObjectWrap<Proxy> {
public:
    static Napi::FunctionReference Constructor;
    static void Initialize(Napi::Env& env, Napi::Object& exports);

    Proxy(const Napi::CallbackInfo& info);
    ~Proxy();

protected:
    inline Napi::Value Run(const Napi::CallbackInfo& info);

    template <const char* MSG>
    inline void SendCommand(const Napi::CallbackInfo& info);

    inline Napi::Value GetFrontEnd(const Napi::CallbackInfo& info);
    inline Napi::Value GetBackEnd(const Napi::CallbackInfo& info);

private:
    Napi::ObjectReference front_ref;
    Napi::ObjectReference back_ref;
    Napi::ObjectReference capture_ref;

    void* control_sub = nullptr;
    void* control_pub = nullptr;
};
}
