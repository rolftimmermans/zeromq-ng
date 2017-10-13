const zmq = require("../..")
const {assert} = require("chai")
const {uniqAddress} = require("./helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`socket with ${proto} push/pull`, function() {
    beforeEach(function() {
      if (proto == "ipc" && !zmq.capability.ipc) this.skip()

      this.push = new zmq.Push
      this.pull = new zmq.Pull
    })

    afterEach(function() {
      this.push.close()
      this.pull.close()
      gc()
    })

    describe("send", function() {
      it("should deliver messages", async function() {
        /* PUSH  -> foo ->  PULL
                 -> bar ->
                 -> baz ->
                 -> qux ->
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received = []

        await this.pull.bind(address)
        await this.push.connect(address)

        for (const msg of messages) {
          await this.push.send(msg)
        }

        for await (const [msg] of this.pull) {
          assert.instanceOf(msg, Buffer)
          received.push(msg.toString())
          if (received.length == messages.length) break
        }

        assert.deepEqual(received, messages)
      })
    })
  })
}
