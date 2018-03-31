const zmq = require("../..")
const weak = require("weak")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} send/receive`, function() {
    beforeEach(function() {
      this.sockA = new zmq.Pair({linger: 0})
      this.sockB = new zmq.Pair({linger: 0})
    })

    afterEach(function() {
      this.sockA.close()
      this.sockB.close()
      gc()
    })

    describe("when not connected", function() {
      beforeEach(async function() {
        this.sockA.sendHighWaterMark = 1
        await this.sockA.connect(uniqAddress(proto))
      })

      it("should be writable", async function() {
        assert.equal(this.sockA.writable, true)
      })

      it("should not be readable", async function() {
        assert.equal(this.sockA.readable, false)
      })

      it("should honor send high water mark and timeout", async function() {
        this.sockA.sendTimeout = 2
        await this.sockA.send(Buffer.alloc(8192))
        try {
          await this.sockA.send(Buffer.alloc(8192))
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket temporarily unavailable")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should copy and release small buffers", async function() {
        let released = false
        const release = () => released = true

        this.sockA.connect(uniqAddress(proto))
        const send = async size => {
          const msg = Buffer.alloc(size)
          weak(msg, release)
          await this.sockA.send(msg)
        }

        await send(16)
        gc()
        assert.equal(released, true)
      })

      it("should retain large buffers", async function() {
        let released = false
        const release = () => released = true

        this.sockA.connect(uniqAddress(proto))
        const send = async size => {
          const msg = Buffer.alloc(size)
          weak(msg, release)
          await this.sockA.send(msg)
        }

        await send(1025)
        gc()
        assert.equal(released, false)
      })
    })

    describe("when connected", function() {
      beforeEach(async function() {
          const address = uniqAddress(proto)
        await this.sockB.bind(address)
        await this.sockA.connect(address)
      })

      it("should be writable", async function() {
        assert.equal(this.sockA.writable, true)
      })

      it("should not be readable", async function() {
        assert.equal(this.sockA.readable, false)
      })

      it("should be readable if message is available", async function() {
        await this.sockB.send(Buffer.from("foo"))
        await new Promise(resolve => setTimeout(resolve, 15))
        assert.equal(this.sockA.readable, true)
      })

      it("should deliver single string message", async function() {
        const sent = "foo"
        await this.sockA.send(sent)

        const recv = await this.sockB.receive()
        assert.deepEqual([sent], recv.map(buf => buf.toString()))
      })

      it("should deliver single buffer message", async function() {
        const sent = Buffer.from("foo")
        await this.sockA.send(sent)

        const recv = await this.sockB.receive()
        assert.deepEqual([sent], recv)
      })

      it("should deliver single multipart string message", async function() {
        const sent = ["foo", "bar"]
        await this.sockA.send(sent)

        const recv = await this.sockB.receive()
        assert.deepEqual(sent, recv.map(buf => buf.toString()))
      })

      it("should deliver single multipart buffer message", async function() {
        const sent = [Buffer.from("foo"), Buffer.from("bar")]
        await this.sockA.send(sent)

        const recv = await this.sockB.receive()
        assert.deepEqual(sent, recv)
      })

      it("should deliver multiple messages", async function() {
        const messages = ["foo", "bar", "baz", "qux"]
        for (const msg of messages) {
          await this.sockA.send(msg)
        }

        const received = []
        for await (const msg of this.sockB) {
          received.push(msg.toString())
          if (received.length == messages.length) break
        }

        assert.deepEqual(received, messages)
      })

      it("should deliver messages coercible to string", async function() {
        const messages = [null, function() {}, 16.19, true, {}, Promise.resolve()]
        for (const msg of messages) {
          await this.sockA.send(msg)
        }

        const received = []
        for await (const msg of this.sockB) {
          received.push(msg.toString())
          if (received.length == messages.length) break
        }

        assert.deepEqual(
          received,
          ["null", "function () {}", "16.19", "true", "[object Object]", "[object Promise]"]
        )
      })

      it("should poll simultaneously", async function() {
        const sendReceiveA = async () => {
          const [msg1] = await Promise.all([
            this.sockA.receive(),
            this.sockA.send(Buffer.from("foo")),
          ])
          return msg1.toString()
        }

        const sendReceiveB = async () => {
          const [msg2] = await Promise.all([
            this.sockB.receive(),
            this.sockB.send(Buffer.from("bar")),
          ])
          return msg2.toString()
        }

        const msgs = await Promise.all([sendReceiveA(), sendReceiveB()])
        assert.deepEqual(msgs, ["bar", "foo"])
      })

      it("should poll simultaneously after delay", async function() {
        await new Promise(resolve => setTimeout(resolve, 15))
        const sendReceiveA = async () => {
          const [msg1] = await Promise.all([
            this.sockA.receive(),
            this.sockA.send(Buffer.from("foo")),
          ])
          return msg1.toString()
        }

        const sendReceiveB = async () => {
          const [msg2] = await Promise.all([
            this.sockB.receive(),
            this.sockB.send(Buffer.from("bar")),
          ])
          return msg2.toString()
        }

        const msgs = await Promise.all([sendReceiveA(), sendReceiveB()])
        assert.deepEqual(msgs, ["bar", "foo"])
      })

      it("should honor receive timeout", async function() {
        this.sockA.receiveTimeout = 2
        try {
          await this.sockA.receive()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket temporarily unavailable")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should release buffers", async function() {
        let released = 0
        const release = () => released++

        const address = uniqAddress(proto)
        await this.sockB.bind(address)
        this.sockA.connect(address)

        const send = async size => {
          const msg = Buffer.alloc(size)
          weak(msg, release)
          await this.sockA.send(msg)
        }

        const receive = async () => {
          const msg = await this.sockB.receive()
          weak(msg, release)
        }

        const sent = send(2048)
        await receive()
        await sent
        await new Promise(resolve => setTimeout(resolve, 5))

        gc()
        assert.equal(released, proto == "inproc" ? 1 : 2)
      })

      if (proto == "inproc") {
        it("should share memory of large buffers", async function() {
          const orig = Buffer.alloc(2048)
          await this.sockA.send(orig)

          const echo = async sock => {
            const msg = await sock.receive()
            sock.send(msg)
          }

          echo(this.sockB)

          const msg = await this.sockA.receive()
          msg[0].writeUInt8(0x40)
          assert.equal(orig.slice(0, 1).toString(), "@")
        })
      }
    })

    describe("when closed", function() {
      beforeEach(function() {
          this.sockA.close()
        this.sockB.close()
      })

      it("should not be writable", async function() {
        assert.equal(this.sockA.writable, false)
      })

      it("should not be readable", async function() {
        assert.equal(this.sockA.readable, false)
      })

      it("should not be able to send", async function() {
        try {
          await this.sockA.send(Buffer.alloc(8192))
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket is closed")
          assert.equal(err.code, "EBADF")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should not be able to receive", async function() {
        try {
          await this.sockA.receive()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket is closed")
          assert.equal(err.code, "EBADF")
          assert.typeOf(err.errno, "number")
        }
      })
    })
  })
}
