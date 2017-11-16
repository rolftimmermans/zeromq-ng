const zmq = require("./load")
const {assert} = require("chai")
const {uniqAddress} = require("../helpers")

/* TODO: Unbind with inproc is broken? */
for (const proto of ["tcp"]) {
  describe(`compat socket with ${proto} unbind`, function() {
    it("should be able to unbind", function(done) {
      const sockA = zmq.socket("dealer")
      const sockB = zmq.socket("dealer")
      const sockC = zmq.socket("dealer")

      const address1 = uniqAddress(proto)
      const address2 = uniqAddress(proto)

      let msgCount = 0
      sockA.bind(address1, err => {
        if (err) throw err
        sockA.bind(address2, err => {
          if (err) throw err

          sockB.connect(address1)
          sockB.send("Hello from sockB.")
          sockC.connect(address2)
          sockC.send("Hello from sockC.")
        })
      })

      sockA.on("unbind", function(addr) {
        if (addr === address1) {
          process.nextTick(() => {
            sockB.send("Error from sockB.")
            sockC.send("Messsage from sockC.")
            setTimeout(() => {
              sockC.send("Final message from sockC.")
            }, 15)
          })
        }
      })

      sockA.on("message", function(msg) {
        msgCount++
        if (msg.toString() === "Hello from sockB.") {
          sockA.unbind(address1, err => {
            if (err) throw err
          })
        } else if (msg.toString() === "Final message from sockC.") {
          assert.equal(msgCount, 4)
          sockA.close()
          sockB.close()
          sockC.close()
          done()
        } else if (msg.toString() === "Error from sockB.") {
          throw Error("sockB should have been unbound")
        }
      })
    })
  })
}
