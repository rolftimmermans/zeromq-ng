/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

namespace zmq {
/* Starts a UV worker. */
class Work {
    /* Simple unique pointer suffices, since uv_work_t does not require
       calling uv_close() on completion. */
    std::unique_ptr<uv_work_t> work{new uv_work_t};

    std::function<void()> execute_callback;
    std::function<void()> complete_callback;

public:
    template <typename... Args>
    static inline uint32_t Queue(Args&&... args) {
        auto work = new Work(std::forward<Args>(args)...);
        return work->Exec();
    }

    inline Work(std::function<void()>&& execute, std::function<void()>&& complete)
        : execute_callback(std::move(execute)), complete_callback(std::move(complete)) {
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
}
