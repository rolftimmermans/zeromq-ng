const zmq = require("./load")
const semver = require("semver")
const {assert} = require("chai")
const {uniqAddress} = require("../helpers")

for (const proto of ["ipc", "tcp"]) {
  describe(`compat socket with ${proto} monitor`, function() {
    beforeEach(function() {
      /* ZMQ < 4.2 occasionally fails with assertion errors. */
      if (semver.satisfies(zmq.version, "< 4.2")) this.skip()

      if (proto == "ipc" && !zmq.capability.ipc) this.skip()

      this.warningListeners = process.listeners("warning")
    })

    afterEach(function() {
      process.removeAllListeners("warning")
      for (const listener of this.warningListeners) {
        process.on("warning", listener)
      }
    })

    it("should be able to monitor the socket", function(done) {
      const rep = zmq.socket("rep")
      const req = zmq.socket("req")

      const address = uniqAddress(proto)

      rep.on("message", function(msg) {
        assert.instanceOf(msg, Buffer)
        assert.equal(msg.toString(), "hello")
        rep.send("world")
      })

      const testedEvents = ["listen", "accept", "disconnect"]
      testedEvents.forEach(function(e) {
        rep.on(e, function(event_value, event_endpoint_addr) {
          assert.equal(event_endpoint_addr.toString(), address)

          testedEvents.pop()
          if (testedEvents.length === 0) {
            rep.unmonitor()
            rep.close()
            done()
          }
        })
      })

      // enable monitoring for this socket
      rep.monitor()

      rep.bind(address, err => {
        if (err) throw err
      })

      rep.on("bind", function() {
        req.connect(address)
        req.send("hello")
        req.on("message", function(msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "world")
          req.close()
          doubleRep.close()
        })

        // Test that bind errors pass an Error both to the callback
        // and to the monitor event
        const doubleRep = zmq.socket("rep")
        doubleRep.monitor()
        doubleRep.on("bind_error", function(errno, bindAddr, ex) {
          assert.instanceOf(ex, Error)
        })

        doubleRep.bind(address, err => {
          assert.instanceOf(err, Error)
        })
      })
    })

    it("should read multiple events on monitor interval", function(done) {
      this.slow(150)
      process.removeAllListeners("warning")

      const req = zmq.socket("req")
      const address = uniqAddress(proto)

      req.setsockopt(zmq.ZMQ_RECONNECT_IVL, 1)

      if (semver.satisfies(zmq.version, ">= 4.2")) {
        req.setsockopt(zmq.ZMQ_CONNECT_TIMEOUT, 10)
      }

      let closeTime
      req.on("close", function() {
        closeTime = Date.now()
      })

      req.on("connect_retry", function() {
        const diff = Date.now() - closeTime
        req.unmonitor()
        req.close()
        assert.isAtMost(diff, 25)
        done()
      })

      req.monitor(10, 0)
      req.connect(address)
    })
  })
}
