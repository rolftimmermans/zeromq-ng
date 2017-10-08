/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include "uvhandle.h"

namespace zmq {
    /* Starts a UV poller with an attached timeout. The poller can be started
       and stopped multiple times. */
    class Poller {
        UvHandle<uv_poll_t> poll;

        UvHandle<uv_timer_t> readable_timer;
        std::function<bool()> readable_validate;
        std::function<void()> readable_callback;

        UvHandle<uv_timer_t> writable_timer;
        std::function<bool()> writable_validate;
        std::function<void()> writable_callback;

        int32_t events{0};

    public:
        ~Poller() {
            /* Trigger all watched events manually, which causes any pending
               operation to succeed or fail immediately. */
            if (events) Trigger(events);
        }

        /* Initialize the poller with the given file descriptor. FD should be
           ZMQ style edge-triggered, with READABLE state indicating that ANY
           event may be present on the corresponding ZMQ socket. */
        inline int32_t Init(uv_os_sock_t& fd) {
            int32_t err;

            poll->data = this;
            err = uv_poll_init_socket(uv_default_loop(), poll, fd);
            if (err != 0) return err;

            readable_timer->data = this;
            err = uv_timer_init(uv_default_loop(), readable_timer);
            if (err != 0) return err;

            writable_timer->data = this;
            err = uv_timer_init(uv_default_loop(), writable_timer);
            if (err != 0) return err;

            return 0;
        }

        /* Safely close and release all handles. This can be called before
           destruction to release resources early. */
        inline void Reset() {
            /* Trigger all watched events manually, which causes any pending
               operation to succeed or fail immediately. */
            if (events) Trigger(events);

            /* Release references to all UV handles. */
            poll.reset(nullptr);
            readable_timer.reset(nullptr);
            writable_timer.reset(nullptr);
        }

        inline void SetReadableValidate(std::function<bool()>&& callback) {
            readable_validate = callback;
        }

        inline void SetWritableValidate(std::function<bool()>&& callback) {
            writable_validate = callback;
        }

        inline bool PollingReadable() const {
            return events & UV_READABLE;
        }

        inline bool PollingWritable() const {
            return events & UV_WRITABLE;
        }

        /* Start polling for readable state, with the given timeout. */
        inline void PollReadable(int64_t timeout, std::function<void()>&& callback) {
            assert((events & UV_READABLE) == 0);
            readable_callback = callback;

            if (timeout > 0) {
                auto result = uv_timer_start(readable_timer, [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_READABLE);
                }, timeout, 0);

                assert(result == 0);
            }

            if (!events) {
                /* Only start polling if we were not polling already. */
                auto result = uv_poll_start(poll, UV_READABLE, Callback);
                assert(result == 0);
            }

            events |= UV_READABLE;
        }

        inline void PollWritable(int64_t timeout, std::function<void()>&& callback) {
            assert((events & UV_WRITABLE) == 0);
            writable_callback = callback;

            if (timeout > 0) {
                auto result = uv_timer_start(writable_timer, [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_WRITABLE);
                }, timeout, 0);

                assert(result == 0);
            }

            /* Note: We poll for READS only! "ZMQ shall signal ANY pending
               events on the socket in an edge-triggered fashion by making the
               file descriptor become ready for READING." */
            if (!events) {
                auto result = uv_poll_start(poll, UV_READABLE, Callback);
                assert(result == 0);
            }

            events |= UV_WRITABLE;
        }

        /* Trigger any events that are ready. Use validation callbacks to see
           which events are actually available. */
        inline void Trigger() {
            if (events & UV_READABLE) {
                if (readable_validate()) Trigger(UV_READABLE);
            }

            if (events & UV_WRITABLE) {
                if (writable_validate()) Trigger(UV_WRITABLE);
            }
        }

    private:
        /* Trigger one or more specific events manually. No validation is
           performed, which means these will cause EAGAIN errors if no events
           were actually available. */
        inline void Trigger(int32_t triggered) {
            events &= ~triggered;
            if (!events) {
                auto result = uv_poll_stop(poll);
                assert(result == 0);
            }

            if (triggered & UV_READABLE) {
                auto result = uv_timer_stop(readable_timer);
                assert(result == 0);
                readable_callback();
            }

            if (triggered & UV_WRITABLE) {
                auto result = uv_timer_stop(writable_timer);
                assert(result == 0);
                writable_callback();
            }
        }

        /* Callback is called when FD is set to a readable state. This is an
           edge trigger that should allow us to check for read AND write events.
           There is no guarantee that any events are available. */
        static void Callback(uv_poll_t* poll, int32_t status, int32_t events) {
            auto& poller = *reinterpret_cast<Poller*>(poll->data);
            if (status == 0) poller.Trigger();
        };
    };
}
