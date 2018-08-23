/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

namespace zmq {
/* Starts a UV worker. */
template <typename E, typename C>
class Work {
    /* Simple unique pointer suffices, since uv_work_t does not require
       calling uv_close() on completion. */
    std::unique_ptr<uv_work_t> work{new uv_work_t};

    E execute_callback;
    C complete_callback;

public:
    inline Work(E execute, C complete)
        : execute_callback(execute), complete_callback(complete) {
        work->data = this;
    }

    inline uint32_t Exec() {
        auto err = uv_queue_work(uv_default_loop(), work.get(),
            [](uv_work_t* req) {
                auto& work = *reinterpret_cast<Work*>(req->data);
                work.execute_callback();
            },
            [](uv_work_t* req, int status) {
                auto& work = *reinterpret_cast<Work*>(req->data);
                work.complete_callback();
                delete &work;
            });

        if (err != 0) delete this;

        return err;
    }
};

template <typename E, typename C>
static inline uint32_t Queue(E execute, C complete) {
    auto work = new Work<E, C>(execute, complete);
    return work->Exec();
}
}
