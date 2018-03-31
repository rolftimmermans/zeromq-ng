const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} pub/sub`, function() {
    beforeEach(function() {
      this.pub = new zmq.Publisher
      this.sub = new zmq.Subscriber
    })

    afterEach(function() {
      this.pub.close()
      this.sub.close()
      gc()
    })

    describe("send", function() {
      it("should deliver messages", async function() {
        /* PUB  -> foo ->  SUB
                -> bar ->  subscribed to all
                -> baz ->
                -> qux ->
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received = []

        /* Subscribe to all. */
        this.sub.subscribe()

        await this.sub.bind(address)
        await this.pub.connect(address)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => setTimeout(resolve, 25))
          for (const msg of messages) {
            await this.pub.send(msg)
          }
        }

        const receive = async () => {
          for await (const [msg] of this.sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length == messages.length) break
          }
        }

        await Promise.all([send(), receive()])
        assert.deepEqual(received, messages)
      })
    })

    describe("subscribe/unsubscribe", function() {
      it("should filter messages", async function() {
        /* PUB  -> foo -X  SUB
                -> bar ->  subscribed to "ba"
                -> baz ->
                -> qux -X
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received = []

        this.sub.subscribe("fo", "ba", "qu")
        this.sub.unsubscribe("fo", "qu")

        await this.sub.bind(address)
        await this.pub.connect(address)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => setTimeout(resolve, 25))
          for (const msg of messages) {
            await this.pub.send(msg)
          }
        }

        const receive = async () => {
          for await (const [msg] of this.sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length == 2) break
          }
        }

        await Promise.all([send(), receive()])
        assert.deepEqual(received, ["bar", "baz"])
      })
    })
  })
}
