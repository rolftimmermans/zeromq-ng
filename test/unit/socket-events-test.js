const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} events`, function() {
    beforeEach(function() {
      this.sockA = new zmq.Dealer
      this.sockB = new zmq.Dealer
    })

    afterEach(function() {
      this.sockA.close()
      this.sockB.close()
      gc()
    })

    describe("when not connected", function() {
      it("should receive events", async function() {
        const address = uniqAddress(proto)
        const events = []

        const read = async () => {
          for await (const event of this.sockA.events) {
            events.push(event)
          }
        }

        const done = read()
        await this.sockA.close()
        await done

        assert.deepEqual(events, [["stop", {}]])
      })
    })

    describe("when connected", function() {
      it("should return same object", function() {
        assert.equal(this.sockA.events, this.sockA.events)
      })

      it("should receive bind events", async function() {
        const address = uniqAddress(proto)
        const events = []

        const read = async () => {
          for await (const event of this.sockA.events) {
            events.push(event)
          }
        }

        const done = read()

        await this.sockA.bind(address)
        await this.sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        this.sockA.close()
        this.sockB.close()
        await done
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["stop", {}]])
        } else {
          assert.deepInclude(events, ["listening", {address}])
          assert.deepInclude(events, ["accept", {address}])
          assert.deepInclude(events, ["close", {address}])
          assert.deepInclude(events, ["stop", {}])
        }
      })

      it("should receive connect events", async function() {
        const address = uniqAddress(proto)
        const events = []

        const read = async () => {
          for await (const event of this.sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await this.sockA.bind(address)
        await this.sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        this.sockA.close()
        this.sockB.close()
        await done
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["stop", {}]])
        } else {
          if (proto == "tcp") {
            assert.deepInclude(events, ["connectDelay", {address}])
          }

          assert.deepInclude(events, ["connect", {address}])
          assert.deepInclude(events, ["stop", {}])
        }
      })

      it("should receive error events", async function() {
        const address = uniqAddress(proto)
        const events = []

        const read = async () => {
          for await (const event of this.sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await this.sockA.bind(address)
        try {
          await this.sockB.bind(address)
        } catch (err) {
          /* Ignore error here */
        }

        await new Promise(resolve => setTimeout(resolve, 15))
        this.sockA.close()
        this.sockB.close()
        await done

        if (proto == "tcp") {
          const [, data] = events.find(([ev]) => ev == "bindError")
          assert.equal("tcp://" + data.address, address)
          assert.instanceOf(data.error, Error)
          assert.equal(data.error.message, "Address already in use")
          assert.equal(data.error.code, "EADDRINUSE")
          assert.typeOf(data.error.errno, "number")
        }

        assert.deepInclude(events, ["stop", {}])
      })

      it("should receive events with emitter", async function() {
        const address = uniqAddress(proto)
        const events = []

        this.sockA.events.on("listening", data => {
          events.push(["listening", data])
        })

        this.sockA.events.on("accept", data => {
          events.push(["accept", data])
        })

        this.sockA.events.on("close", data => {
          events.push(["close", data])
        })

        this.sockA.events.on("stop", data => {
          events.push(["stop", data])
        })

        assert.throws(
          () => this.sockA.events.receive(),
          Error,
          "Observer is in event emitter mode. After a call to events.on() it is not possible to read events with events.receive()."
        )

        await this.sockA.bind(address)
        await this.sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        this.sockA.close()
        this.sockB.close()
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["stop", {}]])
        } else {
          assert.deepInclude(events, ["listening", {address}])
          assert.deepInclude(events, ["accept", {address}])
          assert.deepInclude(events, ["close", {address}])
          assert.deepInclude(events, ["stop", {}])
        }
      })
    })

    describe("when closed", function() {
      it("should not be able to receive", async function() {
        const events = this.sockA.events
        this.sockA.close()
        this.sockB.close()

        const [event, data] = await events.receive()
        assert.equal(event, "stop")

        try {
          await events.receive()
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
