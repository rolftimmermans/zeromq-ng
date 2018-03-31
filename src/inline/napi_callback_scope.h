#pragma once

#include "node.h"
#include "v8.h"

typedef struct napi_callback_scope__* napi_callback_scope;

namespace {
namespace v8impl {
static napi_callback_scope JsCallbackScopeFromV8CallbackScope(node::CallbackScope* s) {
    return reinterpret_cast<napi_callback_scope>(s);
}

static v8::Local<v8::Value> V8LocalValueFromJsValue(napi_value v) {
    v8::Local<v8::Value> local;
    memcpy(&local, &v, sizeof(v));
    return local;
}

static node::CallbackScope* V8CallbackScopeFromJsCallbackScope(napi_callback_scope s) {
    return reinterpret_cast<node::CallbackScope*>(s);
}
}
}

namespace node {
template <typename T>
struct ResetInDestructorPersistentTraits {
    static const bool kResetInDestructor = true;
    template <typename S, typename M>
    // Disallow copy semantics by leaving this unimplemented.
    inline static void Copy(const v8::Persistent<S, M>&,
        v8::Persistent<T, ResetInDestructorPersistentTraits<T>>*);
};

// v8::Persistent does not reset the object slot in its destructor.  That is
// acknowledged as a flaw in the V8 API and expected to change in the future
// but for now node::Persistent is the easier and safer alternative.
template <typename T>
using Persistent = v8::Persistent<T, ResetInDestructorPersistentTraits<T>>;
}  // namespace node

static napi_status napi_set_last_error(napi_env env, napi_status error_code,
    uint32_t engine_error_code = 0, void* engine_reserved = nullptr);

static napi_status napi_clear_last_error(napi_env env);

struct napi_env__ {
    explicit napi_env__(v8::Isolate* _isolate, uv_loop_t* _loop)
        : isolate(_isolate), last_error(), loop(_loop) {}
    v8::Isolate* isolate;
    node::Persistent<v8::Value> last_exception;
    node::Persistent<v8::ObjectTemplate> wrap_template;
    node::Persistent<v8::ObjectTemplate> function_data_template;
    node::Persistent<v8::ObjectTemplate> accessor_data_template;
    napi_extended_error_info last_error;
    int open_handle_scopes = 0;
    int open_callback_scopes = 0;
    uv_loop_t* loop = nullptr;
};

#define RETURN_STATUS_IF_FALSE(env, condition, status)                                   \
    do {                                                                                 \
        if (!(condition)) {                                                              \
            return napi_set_last_error((env), (status));                                 \
        }                                                                                \
    } while (0)

#define CHECK_ENV(env)                                                                   \
    do {                                                                                 \
        if ((env) == nullptr) {                                                          \
            return napi_invalid_arg;                                                     \
        }                                                                                \
    } while (0)

#define CHECK_ARG(env, arg)                                                              \
    RETURN_STATUS_IF_FALSE((env), ((arg) != nullptr), napi_invalid_arg)

#define CHECK_MAYBE_EMPTY(env, maybe, status)                                            \
    RETURN_STATUS_IF_FALSE((env), !((maybe).IsEmpty()), (status))

#define CHECK_TO_TYPE(env, type, context, result, src, status)                           \
    do {                                                                                 \
        CHECK_ARG((env), (src));                                                         \
        auto maybe = v8impl::V8LocalValueFromJsValue((src))->To##type((context));        \
        CHECK_MAYBE_EMPTY((env), maybe, (status));                                       \
        (result) = maybe.ToLocalChecked();                                               \
    } while (0)

#define CHECK_TO_OBJECT(env, context, result, src)                                       \
    CHECK_TO_TYPE((env), Object, (context), (result), (src), napi_object_expected)

/* Copied from https://github.com/nodejs/node/blob/master/src/node_api.cc */
inline napi_status napi_open_callback_scope(napi_env env, napi_value resource_object,
    napi_async_context async_context_handle, napi_callback_scope* result) {
    // Omit NAPI_PREAMBLE and GET_RETURN_STATUS because V8 calls here cannot throw
    // JS exceptions.
    CHECK_ENV(env);
    CHECK_ARG(env, result);

    v8::Local<v8::Context> context = env->isolate->GetCurrentContext();

    node::async_context* node_async_context =
        reinterpret_cast<node::async_context*>(async_context_handle);

    v8::Local<v8::Object> resource;
    CHECK_TO_OBJECT(env, context, resource, resource_object);

    *result = v8impl::JsCallbackScopeFromV8CallbackScope(
        new node::CallbackScope(env->isolate, resource, *node_async_context));

    env->open_callback_scopes++;
    return napi_clear_last_error(env);
}

inline napi_status napi_close_callback_scope(napi_env env, napi_callback_scope scope) {
    // Omit NAPI_PREAMBLE and GET_RETURN_STATUS because V8 calls here cannot throw
    // JS exceptions.
    CHECK_ENV(env);
    CHECK_ARG(env, scope);
    if (env->open_callback_scopes == 0) {
        // napi_handle_scope_mismatch
        return napi_status(14);
    }

    env->open_callback_scopes--;
    delete v8impl::V8CallbackScopeFromJsCallbackScope(scope);
    return napi_clear_last_error(env);
}

static inline napi_status napi_clear_last_error(napi_env env) {
    env->last_error.error_code = napi_ok;

    // TODO(boingoing): Should this be a callback?
    env->last_error.engine_error_code = 0;
    env->last_error.engine_reserved = nullptr;
    return napi_ok;
}

static inline napi_status napi_set_last_error(napi_env env, napi_status error_code,
    uint32_t engine_error_code, void* engine_reserved) {
    env->last_error.error_code = error_code;
    env->last_error.engine_error_code = engine_error_code;
    env->last_error.engine_reserved = engine_reserved;
    return error_code;
}
