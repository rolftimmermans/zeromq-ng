const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} pair/pair`, function() {
    beforeEach(function() {
      this.sockA = new zmq.Dealer
      this.sockB = new zmq.Dealer
    })

    afterEach(function() {
      this.sockA.close()
      this.sockB.close()
      gc()
    })

    describe("send", function() {
      it("should deliver messages", async function() {
        /* PAIR  -> foo ->  PAIR
           [A]   -> bar ->  [B]
                 -> baz ->  responds when received
                 -> qux ->
                 <- foo <-
                 <- bar <-
                 <- baz <-
                 <- qux <-
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received = []
        let last = false

        await this.sockA.bind(address)
        await this.sockB.connect(address)

        const echo = async () => {
          for await (const msg of this.sockB) {
            await new Promise(resolve => setTimeout(resolve, 5))
            await this.sockB.send(msg)
            if (last) break
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await this.sockA.send(msg)
          }

          for await (const msg of this.sockA) {
            received.push(msg.toString())
            if (received.length + 1 == messages.length) last = true
            if (received.length == messages.length) break
          }
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)
      })
    })
  })
}
