#pragma once

#include <algorithm>
#include <unordered_set>

typedef void(cb)(void* arg);

namespace zmq {
struct CleanupCallback {
    cb* fn;
    void* arg;
    uint64_t insertion_order;

    struct Hash {
        inline size_t operator()(const CleanupCallback& cb) const {
            return std::hash<void*>()(cb.arg);
        }
    };

    struct Equal {
        inline bool operator()(const CleanupCallback& a, const CleanupCallback& b) const {
            return a.fn == b.fn && a.arg == b.arg;
        }
    };
};

template <typename T>
using set = std::unordered_set<T, typename T::Hash, typename T::Equal>;

static set<CleanupCallback> CleanupHooks;
static uint64_t CleanupCounter = 0;

static void RunCleanup(void*) {
    while (!CleanupHooks.empty()) {
        std::vector<CleanupCallback> callbacks(CleanupHooks.begin(), CleanupHooks.end());

        std::sort(callbacks.begin(), callbacks.end(),
            [](const CleanupCallback& a, const CleanupCallback& b) {
                return a.insertion_order > b.insertion_order;
            });

        for (const CleanupCallback& cb : callbacks) {
            if (CleanupHooks.count(cb) == 0) {
                /* Hook was removed during another hook that was run earlier. */
                continue;
            }

            cb.fn(cb.arg);
            CleanupHooks.erase(cb);
        }
    }
}
}

/* https://github.com/nodejs/abi-stable-node/issues/330 */
inline napi_status napi_add_env_cleanup_hook(napi_env, cb* fn, void* arg) {
    if (zmq::CleanupCounter == 0) {
        node::AtExit(zmq::RunCleanup, nullptr);
    }

    zmq::CleanupHooks.emplace(zmq::CleanupCallback({fn, arg, zmq::CleanupCounter++}));
    return napi_ok;
}

inline napi_status napi_remove_env_cleanup_hook(napi_env, cb* fn, void* arg) {
    zmq::CleanupCallback search({fn, arg, 0});
    zmq::CleanupHooks.erase(search);
    return napi_ok;
}
