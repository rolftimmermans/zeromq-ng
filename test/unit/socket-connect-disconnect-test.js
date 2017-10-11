const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")
const {uniqAddress} = require("./helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`socket with ${proto} connect/disconnect`, function() {
    before(function() {
      /* ZMQ < 4.1 fails with assertion errors with inproc.
         See: https://github.com/zeromq/libzmq/pull/2123/files */
      if (proto == "inproc" && semver.satisfies(zmq.version, "< 4.1")) this.skip()
    })

    beforeEach(function() {
      this.sock = new zmq.Dealer
    })

    afterEach(function() {
      this.sock.close()
      gc()
    })

    describe("connect", function() {
      it("should throw error for invalid uri", async function() {
        try {
          await this.sock.connect("foo-bar")
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Invalid argument")
          assert.equal(err.code, "EINVAL")
          assert.typeOf(err.errno, "number")
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
          assert.equal(err.errno, process.platform == "linux" ? 93 : 43)
          assert.equal(err.address, "foo://bar")
        }
      })
    })

    describe("disconnect", function() {
      it("should throw error if not connected to endpoint", async function() {
        const address = uniqAddress(proto)
        try {
          await this.sock.disconnect(address)
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "No such endpoint")
          assert.equal(err.code, "ENOENT")
          assert.typeOf(err.errno, "number")
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
          assert.typeOf(err.errno, "number")
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
          assert.equal(err.errno, process.platform == "linux" ? 93 : 43)
          assert.equal(err.address, "foo://bar")
        }
      })
    })
  })
}
