# ZeroMQ.js Next Generation

[![Greenkeeper badge](https://badges.greenkeeper.io/rolftimmermans/zeromq-ng.svg)](https://greenkeeper.io/)

Next generation ØMQ bindings for Node.js. The goals of this library are:
* Semantically as similar as possible to the native ØMQ library.
* High performance.
* Use modern JavaScript and Node.js semantics: promises for consumption with `async`/`await`, async iterators (if available at runtime).

# Table of contents

* [Installation](#installation)
* [Examples](#examples)
   * [Push/Pull](#pushpull)
   * [Pub/Sub](#pubsub)
* [API Documentation](#api-documentation)
   * [Class: zmq.Socket](#class-zmqsocket)
   * [Class: zmq.Context](#class-zmqcontext)
   * [Class: zmq.Observer](#class-zmqobserver)
   * [Function: zmq.curveKeypair()](#function-zmqcurvekeypair)
   * [Property: zmq.capability](#property-zmqcapability)
   * [Property: zmq.global](#property-zmqglobal)
   * [Property: zmq.version](#property-zmqversion)


# Installation

Install ZeroMQ.js NG with the following:

`npm install zeromq-nq`

To link against a shared library on your system (if it has been installed and development headers are available):

`npm install zeromq-nq --zmq-shared`


# Examples


## Push/Pull

This example demonstrates how a producer pushes information onto a
socket and how a worker pulls information from the socket.

### producer.js

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

### worker.js

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


## Pub/Sub

This example demonstrates using `zeromq` in a classic Pub/Sub,
Publisher/Subscriber, application.

### publisher.js

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

### subscriber.js

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


# API Documentation


## Class: zmq.Socket

A ØMQ socket. This class should generally not be used directly. Instead, create one of its subclasses that corresponds to the socket type you want to use.


### new Socket()

Create a new socket by calling any of the child class constructors. Each subclass corresponds to a ØMQ socket type:

* **Arguments** <br/>
  <[Object]> An optional object with options that will be set on the socket. Any option setter can be used.

* **Returns** <br/>
  <[Socket]> New socket of the given type.


```js
const zmq = require("zeromq-ng")
const socket = new zmq.Publisher({linger: 0})
```

Available subclasses:

```js
new zmq.Pair(...)
new zmq.Publisher(...)
new zmq.Subscriber(...)
new zmq.Request(...)
new zmq.Response(...)
new zmq.Dealer(...)
new zmq.Router(...)
new zmq.Pull(...)
new zmq.Push(...)
new zmq.XPublisher(...)
new zmq.XSubscriber(...)
new zmq.Stream(...)
```


### socket.bind()

Binds the socket to the given address. During `bind()` the socket cannot be used. Do not call any other methods until the returned promise resolves. Make sure to use `await` or similar.

* **Arguments** <br/>
  <[string]> Address to bind this socket to.

* **Returns** <br/>
  <[Promise]> Resolved when the socket was successfully bound.


```js
await socket.bind("tcp://*:3456")
```


### socket.unbind()

Unbinds the socket to the given address. During `unbind()` the socket cannot be used. Do not call any other methods until the returned promise resolves. Make sure to use `await` or similar.

* **Arguments** <br/>
  <[string]> Address to unbind this socket from.

* **Returns** <br/>
  <[Promise]> Resolved when the socket was successfully unbound.


```js
await socket.bind("tcp://*:3456")
```


### socket.connect()

Starts a new connection to the socket at the given address and returns immediately. The connection will be made asynchronously in the background.

* **Arguments** <br/>
  <[string]> Address to connect this socket to.

* **Returns** <br/>
  <[undefined]>


```js
socket.connect("tcp://127.0.0.1:3456")
```


### socket.disconnect()

Disconnects a previously connected socket from the given address. Disonnection will happen asynchronously in the background.

* **Arguments** <br/>
  <[string]> Address to disconnect this socket from.

* **Returns** <br/>
  <[undefined]>


```js
socket.disconnect("tcp://127.0.0.1:3456")
```


### socket.send()

Sends a single message or a multipart message on the socket. Queues the message immediately if possible, and returns a resolved promise. If the message cannot be queued because the high water mark has been reached, it will wait asynchronously. The promise will be resolved when the message was queued successfully.

Queueing may fail eventually if the socket has been configured with a send timeout.

Only **one** call to `send()` may be executed simultaneously. Do not call `send()` again on the same socket until the returned promise resolves. Make sure to use `await` or similar.

**Note:** Due to the nature of Node.js and to avoid blocking the main thread, this method always sends messages with the `ZMQ_DONTWAIT` flag. It polls asynchronously if sending is not currently possible. This means that all functionality related to timeouts and blocking behaviour is reimplemented in the Node.js bindings. Any differences in behaviour with the native ZMQ library is considered a bug.

* **Arguments** <br/>
  <[string]> | <[Buffer]> | <[Array]<[string] | [Buffer]> Single message or multipart message to queue for sending.

* **Returns** <br/>
  <[Promise]> Resolved when the message was successfully queued.


```js
await socket.send("hello world")
await socket.send(["hello", "world"])
```


### socket.receive()

Waits for the next single or multipart message to become availeble on the socket. Reads a message immediately if possible. If no messages can be read, it will wait asynchonously. The promise will be resolved with an array containing the parts of the next message when available.

Reading may fail eventually if the socket has been configured with a receive timeout.

Only **one** call to `receive()` may be executed simultaneously. Do not call `receive()` again on the same socket until the returned promise resolves. Make sure to use `await` or similar.

**Note:** Due to the nature of Node.js and to avoid blocking the main thread, this method always attempts to read messages with the `ZMQ_DONTWAIT` flag. It polls asynchronously if reading is not currently possible. This means that all functionality related to timeouts and blocking behaviour is reimplemented in the Node.js bindings. Any differences in behaviour with the native ZMQ library is considered a bug.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Promise]<[Array]<[Buffer]>>> Resolved with an array of message parts that were successfully read.


```js
const [msg] = await socket.receive()
const [part1, part2] = await socket.receive()
```


### socket.close()

Closes the socket and disposes of all resources. Any messages that are queued may be discarded or sent in the background depending on the `linger` setting.

After this method is called, it is no longer possible to call any other methods on this socket.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>


```js
socket.close()
```

### socket\[Symbol.asyncIterator\]()

Asynchronously iterate over messages becoming available on the socket. When the socket is closed with `close()`, the iterator will return. Returning early from the iterator will **not** close the socket.

Async iterators are a TC39 stage 3 proposal. They can be used with Babel, TypeScript or natively in Node 8+ with the `--harmony_async_iteration` flag.

The well-known symbol `Symbol.asyncIterator` must be present for this method to be defined. That means any polyfill must be enabled **before** loading this library.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  [AsyncIterator]<[Array]<[Buffer]>>


```js
for await (const [msg] of socket) {
  // ...
}
```


### socket.events

* **Returns** <br/>
  <[Observer]> Event observer for this socket.


### socket.context

* **Returns** <br/>
  <[Context]> Context that this socket belongs to.


### socket.closed

* **Returns** <br/>
  <[boolean]> Whether this socket was previously closed with `close()`.


### socket.readable

* **Returns** <br/>
  <[boolean]> Whether any messages are currently available. If `true`, the next call to `receive()` will immediately read a message from the socket.


### socket.writable

* **Returns** <br/>
  <[boolean]> Whether any messages can be queued for sending. If `true`, the next call to `send()` will immediately queue a message on the socket.


### socket options

Socket options can be set by passing them in an object during socket construction. Alternatively they can be set or retrieved with object properties.

```js
const socket = new zmq.Dealer
socket.routingId = "my_id"
```

```js
const socket = new zmq.Dealer({routingId: "my_id"})
```

Most socket options do not take effect until the next `bind()` or `connect()` call. Setting such an option after the socket is connected or bound will display a warning.

The property names may differ somewhat from the native option names. This is intentional to improve readability of the resulting code. The native option name is **also** available as an alias, with underscores converted to camel case. For example, ZMQ_MAX_MSGSZ is named `maxMessageSize`, but is also available under the alias `maxMsgsz`.

* **affinity** – ZMQ_AFFINITY <br/>
  <[number]> I/O thread affinity, which determines which threads from the ØMQ I/O thread pool associated with the socket's context shall handle newly created connections.

  **Note:** This value is a bit mask, but values higher than `Number.MAX_SAFE_INTEGER` may not be represented accurately! This currently means that configurations beyond 52 threads are unreliable.

* **backlog** – ZMQ_BACKLOG <br/>
  <[number]> Maximum length of the queue of outstanding peer connections for the specified socket. This only applies to connection-oriented transports.

* **immediate** – ZMQ_IMMEDIATE <br/>
  <[boolean]> By default queues will fill on outgoing connections even if the connection has not completed. This can lead to "lost" messages on sockets with round-robin routing (`Req`, `Push`, `Dealer`). If this option is set to `true`, messages shall be queued only to completed connections. This will cause the socket to block if there are no other connections, but will prevent queues from filling on pipes awaiting connection.

* **ipv6** – ZMQ_IPV6 <br/>
  <[boolean]> Enable or disable IPv6. When IPv6 is enabled, the socket will connect to, or accept connections from, both IPv4 and IPv6 hosts.

* **lastEndpoint** (read only) – ZMQ_LAST_ENDPOINT <br/>
  <[string]> The last endpoint bound for TCP and IPC transports.

* **linger** – ZMQ_LINGER <br/>
  <[number]> Determines how long pending messages which have yet to be sent to a peer shall linger in memory after a socket is closed with `close()`.

* **mandatory** (only on `Router` sockets) – ZMQ_ROUTER_MANDATORY <br/>
  <[boolean]> A value of `false` is the default and discards the message silently when it cannot be routed or the peer's high water mark is reached. A value of `true` causes `send()` to fail if it cannot be routed, or wait asynchronously if the high water mark is reached.

* **maxMessageSize** – ZMQ_MAXMSGSIZE <br/>
  <[number]> Limits the size of the inbound message. If a peer sends a message larger than the limit it is disconnected. Value of -1 means no limit.

* **multicastHops** – ZMQ_MULTICAST_HOPS <br/>
  <[number]> Sets the time-to-live field in every multicast packet sent from this socket. The default is 1 which means that the multicast packets don't leave the local network.

* **rate** – ZMQ_RATE <br/>
  <[number]> Maximum send or receive data rate for multicast transports such as `pgm`.

* **receiveBufferSize** – ZMQ_RCVBUF <br/>
  <[number]> Underlying kernel receive buffer size in bytes. A value of -1 means leave the OS default unchanged.

* **receiveHighWaterMark** – ZMQ_RCVHWM <br/>
  <[number]> The high water mark is a hard limit on the maximum number of incoming messages ØMQ shall queue in memory for any single peer that the specified socket is communicating with. A value of zero means no limit.

  If this limit has been reached the socket shall enter an exceptional state and depending on the socket type, ØMQ shall take appropriate action such as blocking or dropping sent messages.

* **receiveTimeout** – ZMQ_RCVTIMEO <br/>
  <[number]> Sets the timeout receiving messages on the socket. If the value is 0, `receive()` will return a rejected promise immediately if there is no message to receive. If the value is -1, it will wait asynchronously until a message is available. For all other values, it will wait for a message for that amount of time before rejecting.

* **reconnectInterval** – ZMQ_RECONNECT_IVL <br/>
  <[number]> Oeriod ØMQ shall wait between attempts to reconnect disconnected peers when using connection-oriented transports. The value -1 means no reconnection.

* **reconnectMaxInterval** – ZMQ_RECONNECT_IVL_MAX <br/>
  <[number]> Maximum period ØMQ shall wait between attempts to reconnect. On each reconnect attempt, the previous interval shall be doubled untill `reconnectMaxInterval` is reached. This allows for exponential backoff strategy. Zero (the default) means no exponential backoff is performed and reconnect interval calculations are only based on `reconnectInterval`.

* **recoveryInterval** – ZMQ_RECOVERY_IVL <br/>
  <[number]> Maximum time in milliseconds that a receiver can be absent from a multicast group before unrecoverable data loss will occur.

* **routingId** – ZMQ_IDENTITY <br/>
  <[string] | [Buffer]> The identity of the specified socket when connecting to a `Router` socket.

* **sendBufferSize** – ZMQ_SNDBUF <br/>
  <[number]> Underlying kernel transmit buffer size in bytes. A value of -1 means leave the OS default unchanged.

* **sendHighWaterMark** – ZMQ_SNDHWM <br/>
  <[number]> The high water mark is a hard limit on the maximum number of outgoing messages ØMQ shall queue in memory for any single peer that the specified socket is communicating with. A value of zero means no limit.

  If this limit has been reached the socket shall enter an exceptional state and depending on the socket type, ØMQ shall take appropriate action such as blocking or dropping sent messages.

* **sendTimeout** – ZMQ_SNDTIMEO <br/>
  <[number]> Sets the timeout for sending messages on the socket. If the value is 0, `send()` will return a rejected promise immediately if the message cannot be sent. If the value is -1, it will wait asynchronously until the message is sent. For all other values, it will try to send the message for that amount of time before rejecting.

* **tcpKeepalive** – ZMQ_TCP_KEEPALIVE <br/>
  <[number]> Override SO_KEEPALIVE socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveCount** – ZMQ_TCP_KEEPALIVE_CNT <br/>
  <[number]> Overrides TCP_KEEPCNT socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveIdle** – ZMQ_TCP_KEEPALIVE_IDLE <br/>
  <[number]> Overrides TCP_KEEPIDLE / TCP_KEEPALIVE socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveInterval** – ZMQ_TCP_KEEPALIVE_INTVL <br/>
  <[number]> Overrides TCP_KEEPINTVL socket option (if supported by the OS). The default value of -1 leaves it to the OS default.

* **type** (read only) – ZMQ_TYPE <br/>
  <[number]> Retrieve the socket type. This is fairly useless because you can inspect the JavaScript constructor with `socket.constructor`.

* **verbose** (only on `XPublisher` sockets) – ZMQ_XPUB_VERBOSE <br/>
  <[boolean]> If set to `true` the socket passes all subscribe messages to the caller. If set to `false` (default) these are not visible to the caller.

### socket security options

Listed below are all socket options that are related to setting and retrieving the security mechanism.

* **curveServer** – ZMQ_CURVE_SERVER <br/>
  <[boolean]> Defines whether the socket will act as server for CURVE security. A value of `true` means the socket will act as CURVE server. A value of `false` means the socket will not act as CURVE server, and its security role then depends on other option settings.

* **curveSecretKey** – ZMQ_CURVE_SECRETKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term secret key. You must set this on both CURVE client and server sockets. You can create a new keypair with `zmq.curveKeypair()`.

* **curvePublicKey** – ZMQ_CURVE_PUBLICKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term public key. You must set this on CURVE client sockets. A server socket does not need to know its own public key. You can create a new keypair with `zmq.curveKeypair()`.

* **curveServerKey** – ZMQ_CURVE_SERVERKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term server key. This is the public key of the CURVE *server* socket. You must set this on CURVE *client* sockets. This key must have been generated together with the server's secret key. You can create a new keypair with `zmq.curveKeypair()`.

* **plainServer** – ZMQ_PLAIN_SERVER <br/>
  <[boolean]> Defines whether the socket will act as server for PLAIN security. A value of `true` means the socket will act as PLAIN server. A value of `false` means the socket will not act as PLAIN server, and its security role then depends on other option settings.

* **plainUsername** – ZMQ_PLAIN_USERNAME <br/>
  <[string] | [Buffer]> Sets the username for outgoing connections over TCP or IPC. If you set this to a non-null value, the security mechanism used for connections shall be PLAIN.

* **plainPassword** – ZMQ_PLAIN_PASSWORD <br/>
  <[string] | [Buffer]> Sets the password for outgoing connections over TCP or IPC. If you set this to a non-null value, the security mechanism used for connections shall be PLAIN.

* **securityMechanism** (read only) – ZMQ_MECHANISM <br/>
  <[null] | [string]> Returns the current security mechanism for the socket, if any. The security mechanism is set implictly by using any of the relevant security options. The returned value is one of:
  * `null` – No security mechanism is used.
  * `"plain"` – The PLAIN mechanism defines a simple username/password mechanism that lets a server authenticate a client. PLAIN makes no attempt at security or confidentiality.
  * `"curve"` – The CURVE mechanism defines a mechanism for secure authentication and confidentiality for communications between a client and a server. CURVE is intended for use on public networks.
  * `"gssapi"` – The GSSAPI mechanism defines a mechanism for secure authentication and confidentiality for communications between a client and a server using the Generic Security Service Application Program Interface (GSSAPI). The GSSAPI mechanism can be used on both public and private networks.


## Class: zmq.Context

A ØMQ context.


### new Context

Creates a new ØMQ context. It is usually not necessary to instantiate a new context – the global context `zmq.global` is used for new sockets by default.

* **Arguments** <br/>
  <[Object]> An optional object with options that will be set on the context. Any option setter can be used.

* **Returns** <br/>
  <[Context]> New context.


```js
const zmq = require("zeromq-ng")
const context = new zmq.Context({ioThreads: 5})
```


### context.close()

Closes the context.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>


```js
context.close()
```


### context options

Context options can be set by passing them in an object during context construction. Alternatively they can be set or retrieved with object properties.

```js
zmq.global.ioThreads = 5
```

```js
const context = new zmq.Context({ioThreads: 5})
```

The property names may differ somewhat from the native option names. This is intentional to improve readability of the resulting code. The native option name is **also** available as an alias, with underscores converted to camel case. For example, ZMQ_MAX_MSGSZ is named `maxMessageSize`, but is also available under the alias `maxMsgsz`.

* **blocky** – ZMQ_BLOCKY <br/>
  <[boolean]> By default the context will block forever when closed with `close()`. The assumption behind this behavior is that abrupt termination will cause message loss. Most real applications use some form of handshaking to ensure applications receive termination messages, and then terminate the context with `linger` set to zero on all sockets. This setting is an easier way to get the same result. When `blocky` is set to false, all new sockets are given a linger timeout of zero. You must still close all sockets before calling `close()` on the context.

* **ioThreads** – ZMQ_IO_THREADS <br/>
  <[number]> Size of the ØMQ thread pool to handle I/O operations. If your application is using only the `inproc` transport for messaging you may set this to zero, otherwise set it to at least one (default).

* **ipv6** – ZMQ_IPV6 <br/>
  <[boolean]> Enable or disable IPv6. When IPv6 is enabled, a socket will connect to, or accept connections from, both IPv4 and IPv6 hosts.

* **maxMessageSize** – ZMQ_MAX_MSGSZ <br/>
  <[number]> Maximum allowed size of a message sent in the context.

* **maxSockets** – ZMQ_MAX_SOCKETS <br/>
  <[number]> Maximum number of sockets allowed on the context.

* **maxSocketsLimit** (read only) – ZMQ_SOCKET_LIMIT <br/>
  <[number]> Largest number of sockets that can be set with `maxSockets`.

* **threadPriority** (write only) – ZMQ_THREAD_PRIORITY <br/>
  <[number]> Scheduling priority for internal context's thread pool. This option is not available on Windows. Supported values for this option depend on chosen scheduling policy. Details can be found at http://man7.org/linux/man-pages/man2/sched_setscheduler.2.html. This option only applies before creating any sockets on the context.

* **threadSchedulingPolicy** (write only) – ZMQ_THREAD_SCHED_POLICY <br/>
  <[number]> Scheduling policy for internal context's thread pool. This option is not available on Windows. Supported values for this option can be found at http://man7.org/linux/man-pages/man2/sched_setscheduler.2.html. This option only applies before creating any sockets on the context.


## Class: zmq.Observer

An event observer for ØMQ sockets. The event observer can be used in one of two ways, which are **mutually exclusive**:

* By consuming events with `receive()`.
* By attaching event handlers (like a classic Node.js event emitter).


### new Observer

Creates a new ØMQ observer. It is usually not necessary to instantiate a new observer. Access an existing observer for a socket with `socket.events`.

* **Arguments** <br/>
  <[Socket]> The socket to observe.

* **Returns** <br/>
  <[Observer]> New observer for the given socket.


```js
const zmq = require("zeromq-ng")
const socket = new zmq.Publisher
const events = socket.events
```

```js
const zmq = require("zeromq-ng")
const socket = new zmq.Publisher
const events = new zmq.Observer(socket)
```


### observer.on()

Converts this observer into event emitter mode and attaches the event listener.

Conversion to an event emitter means that this observer will now start to wait on events internally. Because only one call to `receive()` can be made simultaneously, **avoid any other calls** to `receive()` when the observer is in event emitter mode.

* **Arguments** <br/>
  <[string]> The name of the event.

  <[Function] (<[Object]>)> The callback function. The function will be invoked with an object with additional details related to this event. Details can include any of:

  * `address` <[string]> – The address that the socket is binding/unbinding/connecting/disconnecting to or from.
  * `reconnectInterval` <[number]> – The reconnect interval in milliseconds.
  * `errno` <[number]> – The error number (errno) generated by the system call that failed.

* **Returns** <br/>
  <[EventEmitter]> The event emitter instance that the listener was attached on.


```js
socket.events.on("listening", details => {
  console.log(`Socket listening on ${details.address}`)
})
```


### observer.receive()

Waits for the next event to become availeble on the observer. Reads an event immediately if possible. If no events are queued, it will wait asynchonously. The promise will be resolved with an array containing the event name and details of the next event when available.

Only **one** call to `receive()` may be executed simultaneously. Do not call `receive()` again until the returned promise resolves. Make sure to use `await` or similar.

When reading events with `receive()` the observer **must not be in event emitter** mode. Avoid mixing calls to `receive()` with attached event handlers via `on()`.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Promise]<[[string], [Object]]>> Event name and additional details related to this event. Details can include any of:
  * `address` <[string]> – The address that the socket is binding/unbinding/connecting/disconnecting to or from.
  * `reconnectInterval` <[number]> – The reconnect interval in milliseconds.
  * `errno` <[number]> – The error number (errno) generated by the system call that failed.


```js
while (!socket.events.closed) {
  const [event, details] = await socket.events.receive()

  switch (event) {
    case "listening":
      console.log(`Socket listening on ${details.address}`)
      // ...
  }
}
```


### observer.close()

Closes the context.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>


```js
socket.events.close()
```


## Function: zmq.curveKeypair()

Returns a new random key pair to be used with the CURVE security mechanism.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Object]> An object that contains the keypair as two properties
  * `publicKey` <[string]> – 40 character Z85-encoded string that contains the public key.
  * `secretKey` <[string]> – 40 character Z85-encoded string that contains the corresponding private key.


To correctly connect two sockets with the CURVE security mechanism:

* Generate a **client** keypair with `zmq.curveKeypair()`.
  * Assign the private and public key on the client socket with `socket.curveSecretKey` and `socket.curvePublicKey`.
* Generate a **server** keypair with `zmq.curveKeypair()`.
  * Assign the private key on the server socket with `socket.curveSecretKey`.
  * Assign the public key **on the client socket** with `socket.curveServerKey`. The server does *not* need to know its own public key. Key distribution is *not* handled by the CURVE security mechanism.


## Property: zmq.capability

Exposes some of the optionally available ØMQ capabilities.

* **Returns** <br/>
  <[Object]> Object with <[string]> keys corresponding to supported ØMQ features and transport protocols. Available capabilities will be set to `true`. Unavailable capabilities will be absent or set to `false`. Possible keys include:

  * `ipc` <[boolean]> – Support for the `ipc://` protocol.
  * `pgm` <[boolean]> – Support for the `pgm://` protocol.
  * `tipc` <[boolean]> – Support for the `tipc://` protocol.
  * `norm` <[boolean]> – Support for the `norm://` protocol.
  * `curve` <[boolean]> – Support for the CURVE security mechanism.
  * `gssapi` <[boolean]> – Support for the GSSAPI security mechanism.
  * `draft` <[boolean]> – The library is built with the draft API.

```js
if (zmq.capability.curve) {
  //
}
```


## Property: zmq.global

Any socket that has no explicit context passed in during construction will be associated with the global context. The global context is automatically closed on process exit.

* **Returns** <br/>
  <[Context]> The default global ØMQ context.


## Property: zmq.version

The version of the ØMQ library the bindings were built with.

* **Returns** <br/>
  <[string]> The ØMQ library version formatted as (major).(minor).(patch). For example: `"4.2.2"`.


[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[AsyncIterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "AsyncIterator"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "boolean"
[Buffer]: https://nodejs.org/api/buffer.html#buffer_class_buffer "Buffer"
[Context]: #class-zmqcontext "zmq.Context"
[EventEmitter]: https://nodejs.org/api/events.html#events_class_eventemitter "EventEmitter"
[Function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[null]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null "null"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[Observer]: #class-zmqobserver "zmq.Observer"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
[Socket]: #class-zmqsocket "zmq.Socket"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "string"
[undefined]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined "undefined"

