const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} router/dealer`, function() {
    beforeEach(async function() {
      /* ZMQ < 4.0.5 has no steerable proxy support. */
      if (semver.satisfies(zmq.version, "< 4.0.5")) this.skip()

      this.proxy = new zmq.Proxy(new zmq.Router, new zmq.Dealer)

      this.frontAddress = uniqAddress(proto)
      this.backAddress = uniqAddress(proto)

      this.req = new zmq.Request
      this.rep = new zmq.Response
    })

    afterEach(function() {
      /* Closing proxy sockets is only necessary if run() fails. */
      this.proxy.frontEnd.close()
      this.proxy.backEnd.close()

      this.req.close()
      this.rep.close()
      gc()
    })

    describe("run", function() {
      it("should proxy messages", async function() {
        /* REQ  -> foo ->  ROUTER <-> DEALER  -> foo ->  REP
                <- foo <-                     <- foo <-
                -> bar ->                     -> bar ->
                <- bar <-                     <- bar <-
                                 pause
                                 resume
                -> baz ->                     -> baz ->
                <- baz <-                     <- baz <-
                -> qux ->                     -> qux ->
                <- qux <-                     <- qux <-
         */

        await this.proxy.frontEnd.bind(this.frontAddress)
        await this.proxy.backEnd.bind(this.backAddress)

        const done = this.proxy.run()

        const messages = ["foo", "bar", "baz", "qux"]
        const received = []
        let last = false

        await this.req.connect(this.frontAddress)
        await this.rep.connect(this.backAddress)

        const echo = async () => {
          for await (const msg of this.rep) {
            await this.rep.send(msg)
            if (last) break
          }
        }

        const send = async () => {
          for (const req of messages) {
            if (received.length == 2) {
              this.proxy.pause()
              this.proxy.resume()
            }

            if (received.length + 1 == messages.length) last = true
            await this.req.send(Buffer.from(req))

            const [rep] = await this.req.receive()
            received.push(rep.toString())
            if (received.length == messages.length) break
          }
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)

        this.proxy.terminate()
        await done
      })
    })
  })
}
