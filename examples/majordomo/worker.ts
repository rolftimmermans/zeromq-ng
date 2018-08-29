import {Dealer} from "zeromq-ng"

import {Header, Message} from "./types"

export class Worker {
  address: string
  service: string = ""
  socket: Dealer = new Dealer

  constructor(address: string = "tcp://127.0.0.1:5555") {
    this.address = address
    this.socket.connect(address)
  }

  async start() {
    await this.socket.send([null, Header.Worker, Message.Ready, this.service])

    const loop = async () => {
      for await (const [blank1, header, type, client, blank2, ...req] of this.socket) {
        const rep = await this.process(...req)
        await this.socket.send([null, Header.Worker, Message.Reply, client, null, ...rep])
      }
    }

    loop()
  }

  async stop() {
    await this.socket.send([null, Header.Worker, Message.Disconnect, this.service])
    this.socket.close()
  }

  async process(...req: Buffer[]): Promise<Buffer[]> {
    return req
  }
}
