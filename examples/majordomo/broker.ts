import {Router} from "zeromq-ng"

import {Service} from "./service"
import {Header, Message} from "./types"

export class Broker {
  address: string
  socket: Router = new Router
  services: Map<string, Service> = new Map
  workers: Map<string, Buffer> = new Map

  constructor(address: string = "tcp://127.0.0.1:5555") {
    this.address = address
  }

  async start() {
    console.log(`starting broker on ${this.address}`)
    await this.socket.bind(this.address)

    const loop = async () => {
      for await (const [sender, blank, header, ...rest] of this.socket) {
        switch (header.toString()) {
        case Header.Client:
          this.handleClient(sender, ...rest)
          break
        case Header.Worker:
          this.handleWorker(sender, ...rest)
          break
        default:
          console.error(`invalid message header: ${header}`)
        }
      }
    }

    loop()
  }

  async stop() {
    this.socket.close()
  }

  async handleClient(client: Buffer, service?: Buffer, ...req: Buffer[]) {
    if (service) {
      this.dispatchRequest(client, service, ...req)
    }
  }

  async handleWorker(worker: Buffer, type?: Buffer, ...rest: Buffer[]) {
    switch (type && type.toString()) {
    case Message.Ready:
      const [service] = rest
      await this.register(worker, service)
      break
    case Message.Reply:
      const [client, blank, ...rep] = rest
      await this.dispatchReply(worker, client, ...rep)
      break
    case Message.Heartbeat:
      /* Heartbeats not implemented yet. */
      break
    case Message.Disconnect:
      await this.deregister(worker)
      break
    default:
      console.error(`invalid worker message type: ${type}`)
    }
  }

  async register(worker: Buffer, service: Buffer) {
    this.setWorkerService(worker, service)
    await this.getService(service).register(worker)
  }

  async dispatchRequest(client: Buffer, service: Buffer, ...req: Buffer[]) {
    await this.getService(service).dispatchRequest(client, ...req)
  }

  async dispatchReply(worker: Buffer, client: Buffer, ...rep: Buffer[]) {
    const service = this.getWorkerService(worker)
    await this.getService(service).dispatchReply(worker, client, ...rep)
  }

  async deregister(worker: Buffer) {
    const service = this.getWorkerService(worker)
    await this.getService(service).deregister(worker)
  }

  getService(service: Buffer): Service {
    const name = service.toString()
    if (this.services.has(name)) {
      return this.services.get(name)!
    } else {
      const service = new Service(this.socket, name)
      this.services.set(name, service)
      return service
    }
  }

  getWorkerService(worker: Buffer): Buffer {
    return this.workers.get(worker.toString('hex'))!
  }

  setWorkerService(worker: Buffer, service: Buffer) {
    this.workers.set(worker.toString('hex'), service)
  }
}
