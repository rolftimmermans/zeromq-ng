if (process.versions["electron"] === undefined && !process.env["NO_COMPAT_TEST"]) {
  const zmq = require("./load")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto}`, function() {
      it("should cooperate with gc", function(done) {
        const sockA = zmq.socket("dealer")
        const sockB = zmq.socket("dealer")

        /**
         * We create 2 dealer sockets.
         * One of them (`a`) is not referenced explicitly after the main loop
         * finishes so it"s a pretender for garbage collection.
         * This test performs gc() explicitly and then tries to send a message
         * to a dealer socket that could be destroyed and collected.
         * If a message is delivered, than everything is ok. Otherwise the guard
         * timeout will make the test fail.
         */
        sockA.on("message", function(msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          sockA.close()
          sockB.close()
          done()
        })

        let bound = false

        const address = uniqAddress(proto)
        sockA.bind(address, err => {
          if (err) {
            clearInterval(interval)
            done(err)
          } else {
            bound = true
          }
        })

        let interval = setInterval(function() {
          gc()
          if (bound) {
            clearInterval(interval)
            sockB.connect(address)
            sockB.send("hello")
          }
        }, 15)
      })
    })
  }
} else {
  console.log("Running in electron: GC test skipped.")
}
