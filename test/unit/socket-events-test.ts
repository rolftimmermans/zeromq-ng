import * as zmq from "../.."
import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} events`, function() {
    let sockA: zmq.Dealer
    let sockB: zmq.Dealer

    beforeEach(function() {
      sockA = new zmq.Dealer
      sockB = new zmq.Dealer
    })

    afterEach(function() {
      sockA.close()
      sockB.close()
      global.gc()
    })

    describe("when not connected", function() {
      it("should receive events", async function() {
        const events: [string, zmq.EventDetails][] = []

        const read = async () => {
          for await (const event of sockA.events) {
            events.push(event)
          }
        }

        const done = read()
        await sockA.close()
        await done

        assert.deepEqual(events, [["end", {}]])
      })
    })

    describe("when connected", function() {
      it("should return same object", function() {
        assert.equal(sockA.events, sockA.events)
      })

      it("should receive bind events", async function() {
        const address = uniqAddress(proto)
        const events: [string, zmq.EventDetails][] = []

        const read = async () => {
          for await (const event of sockA.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["end", {}]])
        } else {
          assert.deepInclude(events, ["bind", {address}])
          assert.deepInclude(events, ["accept", {address}])
          assert.deepInclude(events, ["close", {address}])
          assert.deepInclude(events, ["end", {}])
        }
      })

      it("should receive connect events", async function() {
        const address = uniqAddress(proto)
        const events: [string, zmq.EventDetails][] = []

        const read = async () => {
          for await (const event of sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["end", {}]])
        } else {
          if (proto == "tcp") {
            assert.deepInclude(events, ["connect:delay", {address}])
          }

          assert.deepInclude(events, ["connect", {address}])
          assert.deepInclude(events, ["end", {}])
        }
      })

      it("should receive error events", async function() {
        const address = uniqAddress(proto)
        const events: [string, zmq.EventDetails][] = []

        const read = async () => {
          for await (const event of sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        try {
          await sockB.bind(address)
        } catch (err) {
          /* Ignore error here */
        }

        await new Promise(resolve => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done

        if (proto == "tcp") {
          const [, details] = events.find(([ev]) => ev == "bind:error")
          const data = details as zmq.EventDetails
          assert.equal("tcp://" + data.address, address)
          assert.instanceOf(data.error, Error)
          assert.equal(data.error!.message, "Address already in use")
          assert.equal(data.error!.code, "EADDRINUSE")
          assert.typeOf(data.error!.errno, "number")
        }

        assert.deepInclude(events, ["end", {}])
      })

      it("should receive events with emitter", async function() {
        const address = uniqAddress(proto)
        const events: [string, zmq.EventDetails][] = []

        sockA.events.on("bind", (data: zmq.EventDetails) => {
          events.push(["bind", data])
        })

        sockA.events.on("accept", (data: zmq.EventDetails) => {
          events.push(["accept", data])
        })

        sockA.events.on("close", (data: zmq.EventDetails) => {
          events.push(["close", data])
        })

        sockA.events.on("end", (data: zmq.EventDetails) => {
          events.push(["end", data])
        })

        assert.throws(
          () => sockA.events.receive(),
          Error,
          "Observer is in event emitter mode. After a call to events.on() it is not possible to read events with events.receive()."
        )

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise(resolve => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await new Promise(resolve => setTimeout(resolve, 15))

        if (proto == "inproc") {
          assert.deepEqual(events, [["end", {}]])
        } else {
          assert.deepInclude(events, ["bind", {address}])
          assert.deepInclude(events, ["accept", {address}])
          assert.deepInclude(events, ["close", {address}])
          assert.deepInclude(events, ["end", {}])
        }
      })
    })

    describe("when closed", function() {
      it("should not be able to receive", async function() {
        const events = sockA.events
        sockA.close()
        sockB.close()

        const [event] = await events.receive()
        assert.equal(event, "end")

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
