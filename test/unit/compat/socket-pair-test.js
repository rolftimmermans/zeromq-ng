const zmq = require("./load")
const {assert} = require("chai")
const {uniqAddress} = require("../helpers")

for (const proto of ["inproc", "tcp"]) {
  describe(`compat socket with ${proto} pair`, function() {
    it("should support pair-pair", function(done) {
      const pairB = zmq.socket("pair")
      const pairC = zmq.socket("pair")

      const address = uniqAddress(proto)

      let n = 0
      pairB.on("message", function(msg) {
        assert.instanceOf(msg, Buffer)

        switch (n++) {
          case 0:
            assert.equal(msg.toString(), "foo")
            break
          case 1:
            assert.equal(msg.toString(), "bar")
            break
          case 2:
            assert.equal(msg.toString(), "baz")
            pairB.close()
            pairC.close()
            done()
            break
        }
      })

      pairC.on("message", function(msg) {
        assert.instanceOf(msg, Buffer)
        assert.equal(msg.toString(), "barnacle")
      })

      pairB.bind(address, err => {
        if (err) throw err

        pairC.connect(address)
        pairB.send("barnacle")
        pairC.send("foo")
        pairC.send("bar")
        pairC.send("baz")
      })
    })
  })
}
