/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "binding.h"
#include "inline/poller.h"

namespace zmq {
class Observer : public Napi::ObjectWrap<Observer> {
public:
    static Napi::FunctionReference Constructor;
    static void Initialize(Napi::Env& env, Napi::Object& exports);

    Observer(const Napi::CallbackInfo& info);
    ~Observer();

protected:
    inline void Close(const Napi::CallbackInfo& info);
    inline Napi::Value Receive(const Napi::CallbackInfo& info);

    inline Napi::Value GetClosed(const Napi::CallbackInfo& info);

private:
    inline bool ValidateOpen() const;
    inline bool HasEvents();
    void Close();

    force_inline void Receive(const Napi::Promise::Resolver& resolver);

    Poller poller;
    void* socket = nullptr;

    friend class Socket;
};
}
