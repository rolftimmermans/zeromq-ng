import {Request} from "zeromq-ng"

import {Broker} from "./broker"
import {Worker} from "./worker"

async function sleep(msec: number) {
  return new Promise(resolve => setTimeout(resolve, msec))
}

class TeaWorker extends Worker {
  service = "tea"

  async process(...msgs: Buffer[]): Promise<Buffer[]> {
    await sleep(Math.random() * 500)
    return msgs
  }
}

class CoffeeWorker extends Worker {
  service = "coffee"

  async process(...msgs: Buffer[]): Promise<Buffer[]> {
    await sleep(Math.random() * 500)
    return msgs
  }
}

const broker = new Broker

const workers = [
  new TeaWorker,
  new CoffeeWorker,
  new TeaWorker,
]

async function request(service: string, ...req: string[]): Promise<Buffer[]> {
  console.log(`requesting '${req.join(", ")}' from '${service}'`)

  const socket = new Request()
  socket.connect(broker.address)
  await socket.send(["MDPC01", service, ...req])
  const [blank, header, ...res] = await socket.receive()

  console.log(`received '${res.join(", ")}' from '${service}'`)
  return res
}

async function main() {
  broker.start()
  workers.forEach(worker => worker.start())

  /* Issue many requests in parallel. */
  const beverages = await Promise.all([
    request("tea", "oolong"),
    request("tea", "sencha"),
    request("tea", "earl grey", "with milk"),
    request("tea", "jasmine"),
    request("coffee", "cappuccino"),
    request("coffee", "latte", "with soy milk"),
    request("coffee", "espresso"),
    request("coffee", "irish coffee"),
  ])

  workers.forEach(worker => worker.stop())
  broker.stop()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
