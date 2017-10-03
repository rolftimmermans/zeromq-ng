/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "v8.h"
#include "node.h"

namespace zmq {
    /* This is required to resolve promises and run micro task queue after
       resolution. See for more information:
       https://github.com/nodejs/node/issues/15604
    */
    struct V8CallbackScope {
        V8CallbackScope() : isolate(v8::Isolate::GetCurrent()) { }

        v8::Isolate* isolate;
        v8::HandleScope scope{isolate};
        node::CallbackScope callback_scope{isolate, v8::Object::New(isolate), {0, 0}};
    };
}
