const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} router/dealer`, function() {
    beforeEach(function() {
      this.router = new zmq.Router
      this.dealerA = new zmq.Dealer
      this.dealerB = new zmq.Dealer
    })

    afterEach(function() {
      this.router.close()
      this.dealerA.close()
      this.dealerB.close()
      gc()
    })

    describe("send", function() {
      /* TODO: This test is unreliable in CI. */
      it.skip("should deliver messages", async function() {
        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const receivedA = []
        const receivedB = []
        let lastA = false
        let lastB = false

        await this.router.bind(address)
        await this.dealerA.connect(address)
        await this.dealerB.connect(address)

        const echo = async () => {
          for await (const [sender, msg] of this.router) {
            await new Promise(resolve => setTimeout(resolve, 5))
            await this.router.send([sender, msg])
            if (lastA && lastB) break
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await this.dealerA.send(msg)
            await this.dealerB.send(msg)
          }

          for await (const msg of this.dealerA) {
            receivedA.push(msg.toString())
            if (receivedA.length + 1 == messages.length) lastA = true
            if (receivedA.length == messages.length) break
          }

          for await (const msg of this.dealerB) {
            receivedB.push(msg.toString())
            if (receivedB.length + 1 == messages.length) lastB = true
            if (receivedB.length == messages.length) break
          }
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(receivedA, messages)
        assert.deepEqual(receivedB, messages)
      })

      /* This only works reliably with ZMQ 4.2+ */
      if (semver.satisfies(zmq.version, ">= 4.2")) {
        it("should fail unroutable message if mandatory", async function() {
          this.router.mandatory = true
          this.router.sendTimeout = 0
          try {
            await this.router.send(["fooId", "foo"])
            assert.ok(false)
          } catch (err) {
            assert.instanceOf(err, Error)

            /* ZMQ before 4.2.3 returns the wrong error. */
            if (semver.satisfies(zmq.version, ">= 4.2.3")) {
              assert.equal(err.message, "Host unreachable")
              assert.equal(err.code, "EHOSTUNREACH")
              assert.typeOf(err.errno, "number")
            } else {
              assert.equal(err.message, "Socket temporarily unavailable")
              assert.equal(err.code, "EAGAIN")
              assert.typeOf(err.errno, "number")
            }
          }
        })
      }
    })
  })
}
