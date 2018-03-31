const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} req/rep`, function() {
    beforeEach(function() {
      this.req = new zmq.Request
      this.rep = new zmq.Response
    })

    afterEach(function() {
      this.req.close()
      this.rep.close()
      gc()
    })

    describe("send", function() {
      it("should deliver messages", async function() {
        /* REQ  -> foo ->  REP
                <- foo <-
                -> bar ->
                <- bar <-
                -> baz ->
                <- baz <-
                -> qux ->
                <- qux <-
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received = []
        let last = false

        await this.rep.bind(address)
        await this.req.connect(address)

        const echo = async () => {
          for await (const msg of this.rep) {
            await this.rep.send(msg)
            if (last) break
          }
        }

        const send = async () => {
          for (const req of messages) {
            if (received.length + 1 == messages.length) last = true
            await this.req.send(Buffer.from(req))

            const [rep] = await this.req.receive()
            received.push(rep.toString())
            if (received.length == messages.length) break
          }
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)
      })

      it("should throw when waiting for a response", async function() {
        /* REQ  -> foo ->  REP
                -X foo
                <- foo <-
         */

        const address = uniqAddress(proto)
        const received = []
        let last = false

        /* FIXME: Also trigger EFSM without setting timeout. */
        this.req.sendTimeout = 2
        await this.rep.bind(address)
        await this.req.connect(address)

        const echo = async () => {
          const msg = await this.rep.receive()
          await this.rep.send(msg)
        }

        const send = async () => {
          await this.req.send(Buffer.from("foo"))
          assert.equal(this.req.writable, false)

          try {
            await this.req.send(Buffer.from("bar"))
            assert.ok(false)
          } catch (err) {
            assert.instanceOf(err, Error)
            assert.equal(err.message, "Operation cannot be accomplished in current state")
            assert.equal(err.code, "EFSM")
            assert.typeOf(err.errno, "number")
          }

          const [msg] = await this.req.receive()
          assert.deepEqual(msg, Buffer.from("foo"))
        }

        await Promise.all([echo(), send()])
      })
    })
  })
}
