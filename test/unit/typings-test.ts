import * as zmq from "../.."

describe("typings", function() {
  it("should compile successfully", function() {
    /* To test the TypeScript typings this file should compile successfully.
       We don't actually execute the code in this function. */

    // @ts-ignore unused function
    function test() {
      const version: string = zmq.version
      console.log(version)

      const capability = zmq.capability
      if (capability.ipc) console.log("ipc")
      if (capability.pgm) console.log("pgm")
      if (capability.tipc) console.log("tipc")
      if (capability.norm) console.log("norm")
      if (capability.curve) console.log("curve")
      if (capability.gssapi) console.log("gssapi")
      if (capability.draft) console.log("draft")

      const keypair = zmq.curveKeyPair()
      console.log(keypair.publicKey)
      console.log(keypair.secretKey)

      const context = new zmq.Context({
        ioThreads: 1,
        ipv6: true,
      })

      context.threadPriority = 4

      console.log(context.ioThreads)
      console.log(context.ipv6)

      zmq.global.ioThreads = 5
      zmq.global.ipv6 = true

      const socket = new zmq.Dealer({
        context: zmq.global,
        sendTimeout: 200,
        probeRouter: true,
        routingId: "foobar",
      })

      const router = new zmq.Router

      console.log(socket.context)
      console.log(socket.sendTimeout)
      console.log(socket.routingId)

      const exec = async () => {
        await socket.bind("tcp://foobar")
        await socket.unbind("tcp://foobar")

        socket.connect("tcp://foobar")
        socket.disconnect("tcp://foobar")
        router.connect("tcp://foobar", {routingId: "remote_id"})

        for await (const [part1, part2] of socket) {
          console.log(part1)
          console.log(part2)
        }

        const [part1, part2] = await socket.receive()

        await socket.send(part1)
        await socket.send([part1, part2])

        await socket.send([null, Buffer.alloc(1), "foo"])
        await socket.send(null)
        await socket.send(Buffer.alloc(1))
        await socket.send("foo")

        socket.close()

        socket.events.on("bind", details => {
          console.log(details.address)
          console.log(details.interval)
          console.log(details.error)
        })

        for await (const [event, details] of socket.events) {
          if (event == "bind") {
            console.log(details.address)
            console.log(details.interval)
            console.log(details.error)
          }
        }

        const proxy = new zmq.Proxy(new zmq.Router, new zmq.Dealer)
        await proxy.run()

        proxy.pause()
        proxy.resume()
        proxy.terminate()

        proxy.frontEnd.close()
        proxy.backEnd.close()
      }

      exec()
    }
  })
})
