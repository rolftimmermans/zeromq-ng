const zmq = require("../..")
const semver = require("semver")
const weak = require("weak")
const {assert} = require("chai")
const {uniqAddress} = require("./helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`socket with ${proto} close`, function() {
    beforeEach(function() {
      if (proto == "ipc" && !zmq.capability.ipc) this.skip()

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

      it("should fail during bind", async function() {
        let promise
        try {
          promise = this.sock.bind(uniqAddress(proto))
          this.sock.close()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket temporarily unavailable")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
        await promise
      })

      it("should release reference to context", async function() {
        /* ZMQ < 4.2 fails with assertion errors with inproc.
           See: https://github.com/zeromq/libzmq/pull/2123/files */
        if (proto == "inproc" && semver.satisfies(zmq.version, "< 4.2")) this.skip()

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
