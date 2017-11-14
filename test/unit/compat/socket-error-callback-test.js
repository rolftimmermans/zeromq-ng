const zmq = require("./load")
const {assert} = require("chai")

describe("compat socket error callback", function() {
  let sock

  it("should create a socket with mandatory", function() {
    sock = zmq.socket("router")
    sock.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1)
  })

  it("should callback with error when not connected", function(done) {
    sock.send(["foo", "bar"], null, err => {
      assert.instanceOf(err, Error)
      sock.close()
      done()
    })
  })
})
