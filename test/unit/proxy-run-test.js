const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} run`, function() {
    beforeEach(async function() {
      /* ZMQ < 4.0.5 has no steerable proxy support. */
      if (semver.satisfies(zmq.version, "< 4.0.5")) this.skip()

      this.proxy = new zmq.Proxy(new zmq.Router, new zmq.Dealer)
    })

    afterEach(function() {
      this.proxy.frontEnd.close()
      this.proxy.backEnd.close()
      gc()
    })

    describe("run", function() {
      it("should fail if front end is not bound or connected", async function() {
        await this.proxy.backEnd.bind(uniqAddress(proto))

        try {
          await this.proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Front-end socket must be bound or connected")
        }
      })

      it("should fail if front end is not open", async function() {
        await this.proxy.frontEnd.bind(uniqAddress(proto))
        await this.proxy.backEnd.bind(uniqAddress(proto))
        this.proxy.frontEnd.close()

        try {
          await this.proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Front-end socket must be bound or connected")
        }
      })

      it("should fail if back end is not bound or connected", async function() {
        await this.proxy.frontEnd.bind(uniqAddress(proto))

        try {
          await this.proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Back-end socket must be bound or connected")
        }
      })

      it("should fail if back end is not open", async function() {
        await this.proxy.frontEnd.bind(uniqAddress(proto))
        await this.proxy.backEnd.bind(uniqAddress(proto))
        this.proxy.backEnd.close()

        try {
          await this.proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Back-end socket must be bound or connected")
        }
      })
    })
  })
}
