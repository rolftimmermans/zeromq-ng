const zmq = require("../..")
const {assert} = require("chai")
const {uniqAddress} = require("./helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`socket with ${proto} connect/disconnect`, function() {
    beforeEach(function() {
      this.sock = new zmq.Dealer
    })

    afterEach(function() {
      this.sock.close()
      gc()
    })

    describe("connect", function() {
      it("should not block", async function() {
        const start = new Date()
        await this.sock.connect(uniqAddress(proto))
        assert.isAtMost(new Date() - start, 2)
      })

      it("should throw error for invalid uri", async function() {
        try {
          await this.sock.connect("foo-bar")
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Invalid argument")
          assert.equal(err.code, "EINVAL")
          assert.equal(err.errno, 22)
          assert.equal(err.address, "foo-bar")
        }
      })

      it("should throw error for invalid protocol", async function() {
        try {
          await this.sock.connect("foo://bar")
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Protocol not supported")
          assert.equal(err.code, "EPROTONOSUPPORT")
          assert.equal(err.errno, 43)
          assert.equal(err.address, "foo://bar")
        }
      })
    })

    describe("disconnect", function() {
      it("should not block", async function() {
        const address = uniqAddress(proto)
        const start = new Date()
        await this.sock.connect(address)
        await this.sock.disconnect(address)
        assert.isAtMost(new Date() - start, 2)
      })

      it("should throw error if not connected to endpoint", async function() {
        const address = uniqAddress(proto)
        try {
          await this.sock.disconnect(address)
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "No such endpoint")
          assert.equal(err.code, "ENOENT")
          assert.equal(err.errno, 2)
          assert.equal(err.address, address)
        }
      })

      it("should throw error for invalid uri", async function() {
        try {
          await this.sock.disconnect("foo-bar")
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Invalid argument")
          assert.equal(err.code, "EINVAL")
          assert.equal(err.errno, 22)
          assert.equal(err.address, "foo-bar")
        }
      })

      it("should throw error for invalid protocol", async function() {
        try {
          await this.sock.disconnect("foo://bar")
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Protocol not supported")
          assert.equal(err.code, "EPROTONOSUPPORT")
          assert.equal(err.errno, 43)
          assert.equal(err.address, "foo://bar")
        }
      })
    })
  })
}
