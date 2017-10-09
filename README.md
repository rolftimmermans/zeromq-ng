# ZeroMQ.js Next Generation

## Installation

Install ZeroMQ.js NG with the following:

`npm install zeromq-nq`

To use link dynamically with your system's libzmq (if it has been installed and development headers are available):

`npm install zeromq-nq --zmq-dynamic`

## Examples using ZeroMQ

### Push/Pull

This example demonstrates how a producer pushes information onto a
socket and how a worker pulls information from the socket.

**producer.js**

```js
const zmq = require("zeromq-ng")

async function run() {
  const sock = new zmq.Push

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Producer bound to port 3000")

  while (!sock.closed) {
    await sock.send("some work")
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

run()
```

**worker.js**

```js
const zmq = require("zeromq-ng")

async function run() {
  const sock = new zmq.Pull

  sock.connect("tcp://127.0.0.1:3000")
  console.log("Worker connected to port 3000")

  while (!sock.closed) {
    const [msg] = await sock.receive()
    console.log("work: %s", msg.toString())
  }
}

run()
```

### Pub/Sub

This example demonstrates using `zeromq` in a classic Pub/Sub,
Publisher/Subscriber, application.

**publisher.js**

```js
const zmq = require("zeromq-ng")

async function run() {
  const sock = new zmq.Publisher

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Publisher bound to port 3000")

  while (!sock.closed) {
    console.log("sending a multipart message envelope")
    await sock.send(["kitty cats", "meow!"])
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

run()
```

**subscriber.js**

```js
const zmq = require("zeromq-ng")

async function run() {
  const sock = new zmq.Subscriber

  sock.connect("tcp://127.0.0.1:3000")
  sock.subscribe("kitty cats")
  console.log("Subscriber connected to port 3000")

  while (!sock.closed) {
    const [topic, msg] = await sock.receive()
    console.log("received a message related to:", topic, "containing message:", msg)
  }
}

run()
```
