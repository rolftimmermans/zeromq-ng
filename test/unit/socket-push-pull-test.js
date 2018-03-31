const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} push/pull`, function() {
    beforeEach(function() {
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
