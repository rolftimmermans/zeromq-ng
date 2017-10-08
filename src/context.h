/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "binding.h"

namespace zmq {
    extern Napi::ObjectReference GlobalContext;

    class Context : public Napi::ObjectWrap<Context> {
    public:
        static Napi::FunctionReference Constructor;
        static void Initialize(Napi::Env& env, Napi::Object& exports);

        Context(const Napi::CallbackInfo& info);
        ~Context();

    protected:
        inline void Close(const Napi::CallbackInfo& info);

        template<typename T>
        inline Napi::Value GetCtxOpt(const Napi::CallbackInfo& info);

        template<typename T>
        inline void SetCtxOpt(const Napi::CallbackInfo& info);

    private:
        void Close();

        void* context = nullptr;

        friend class Socket;
        friend class Observer;
    };
}
