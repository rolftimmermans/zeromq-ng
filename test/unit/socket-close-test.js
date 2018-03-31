const zmq = require("../..")
const weak = require("weak")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} close`, function() {
    beforeEach(function() {
      this.sock = new zmq.Dealer
    })

    afterEach(function() {
      this.sock.close()
      gc()
    })

    describe("with explicit call", function() {
      it("should close socket", function() {
        assert.equal(this.sock.closed, false)
        this.sock.close()
        assert.equal(this.sock.closed, true)
      })

      it("should close socket and cancel send", async function() {
        assert.equal(this.sock.closed, false)
        const promise = this.sock.send(Buffer.from("foo"))
        this.sock.close()
        assert.equal(this.sock.closed, true)
        try {
          await promise
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket temporarily unavailable")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should close socket and cancel receive", async function() {
        assert.equal(this.sock.closed, false)
        const promise = this.sock.receive()
        this.sock.close()
        assert.equal(this.sock.closed, true)
        try {
          await promise
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket temporarily unavailable")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should close after successful bind", async function() {
        const promise = this.sock.bind(uniqAddress(proto))
        this.sock.close()
        assert.equal(this.sock.closed, false)
        await promise
        assert.equal(this.sock.closed, true)
      })

      it("should close after unsuccessful bind", async function() {
        const address = uniqAddress(proto)
        await this.sock.bind(address)
        const promise = this.sock.bind(address)
        this.sock.close()
        assert.equal(this.sock.closed, false)
        try {
          await promise
          assert.ok(false)
        } catch (err) { /* Ignore */ }
        assert.equal(this.sock.closed, true)
      })

      it("should close after successful unbind", async function() {
        const address = uniqAddress(proto)
        await this.sock.bind(address)
        const promise = this.sock.unbind(address)
        this.sock.close()
        assert.equal(this.sock.closed, false)
        await promise
        assert.equal(this.sock.closed, true)
      })

      it("should close after unsuccessful unbind", async function() {
        const address = uniqAddress(proto)
        const promise = this.sock.unbind(address)
        this.sock.close()
        assert.equal(this.sock.closed, false)
        try {
          await promise
          assert.ok(false)
        } catch (err) { /* Ignore */ }
        assert.equal(this.sock.closed, true)
      })

      it("should release reference to context", async function() {
        let released = false
        let completed = false
        const release = () => {
          if (completed) released = true
        }

        const task = async () => {
          let context = new zmq.Context
          const socket = new zmq.Dealer({context, linger: 0})

          weak(context, release)
          context = null

          gc()
          socket.connect(uniqAddress(proto))
          await socket.send(Buffer.from("foo"))
          socket.close()
          completed = true
        }

        await task()
        gc()
        assert.equal(released, true)
      })
    })

    describe("in gc finalizer", function() {
      it("should release reference to context", async function() {
        let released = false
        const release = () => released = true

        const task = async () => {
          let context = new zmq.Context
          let socket = new zmq.Dealer({context, linger: 0})

          weak(context, release)
          context = null
          socket = null
          gc()
        }

        await task()
        gc()
        assert.equal(released, true)
      })
    })
  })
}
