import * as zmq from "../.."
import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} pair/pair`, function() {
    beforeEach(function() {
      this.sockA = new zmq.Dealer
      this.sockB = new zmq.Dealer
    })

    afterEach(function() {
      this.sockA.close()
      this.sockB.close()
      global.gc()
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
        const received: string[] = []

        await this.sockA.bind(address)
        await this.sockB.connect(address)

        const echo = async () => {
          for await (const msg of this.sockB) {
            await this.sockB.send(msg)
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await this.sockA.send(msg)
          }

          for await (const msg of this.sockA) {
            received.push(msg.toString())
            if (received.length == messages.length) break
          }

          this.sockB.close()
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)
      })
    })
  })
}
