const zmq = require("./load")
const {assert} = require("chai")
const {uniqAddress} = require("../helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`compat socket with ${proto} events`, function() {
    beforeEach(async function() {
      if (proto == "ipc" && !zmq.capability.ipc) this.skip()
    })

    it("should support events", function(done) {
      const rep = zmq.socket("rep")
      const req = zmq.socket("req")

      const address = uniqAddress(proto)

      rep.on("message", function(msg) {
        assert.instanceOf(msg, Buffer)
        assert.equal(msg.toString(), "hello")
        rep.send("world")
      })

      rep.bind(address, err => {
        if (err) throw err
      })

      rep.on("bind", function() {
        req.connect(address)
        req.on("message", function(msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "world")
          req.close()
          rep.close()
          done()
        })

        req.send("hello")
      })
    })
  })
}
