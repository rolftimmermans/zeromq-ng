suite.add(`deliver delayed proto=${proto} msgsize=${msgsize} zmq=cur`, Object.assign({
  fn: deferred => {
    const server = zmq.cur.socket("dealer")
    const client = zmq.cur.socket("dealer")

    let j = 0
    server.on("message", msg => {
      j++
      if (j == n - 1) {
        gc()

        server.close()
        client.close()

        gc()

        deferred.resolve()
      }
    })

    server.bind(address, async () => {
      client.connect(address)

      gc()

      for (let i = 0; i < n; i++) {
        await new Promise(process.nextTick)
        client.send(Buffer.alloc(msgsize))
      }
    })
  }
}, benchOptions))

suite.add(`deliver delayed proto=${proto} msgsize=${msgsize} zmq=ng`, Object.assign({
  fn: async deferred => {
    const server = new zmq.ng.Dealer
    const client = new zmq.ng.Dealer

    await server.bind(address)
    client.connect(address)

    gc()

    const send = async () => {
      for (let i = 0; i < n; i++) {
        await new Promise(process.nextTick)
        await client.send(Buffer.alloc(msgsize))
      }
    }

    const receive = async () => {
      let j = 0
      for (j = 0; j < n - 1; j++) {
        const [msg] = await server.receive()
      }
    }

    await Promise.all([send(), receive()])

    gc()

    server.close()
    client.close()

    gc()

    deferred.resolve()
  }
}, benchOptions))
