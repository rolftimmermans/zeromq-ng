# ZeroMQ.js Next Generation

[![Greenkeeper monitoring](https://img.shields.io/badge/dependencies-monitored-brightgreen.svg)](https://greenkeeper.io/) [![Travis build status](https://img.shields.io/travis/rolftimmermans/zeromq-ng.svg)](https://travis-ci.org/rolftimmermans/zeromq-ng) [![AppVeyor build status](https://img.shields.io/appveyor/ci/rolftimmermans/zeromq-ng.svg)](https://ci.appveyor.com/project/RolfTimmermans/zeromq-ng)

## ⚠️⚠️⚠️ This is work in progress and published only as a beta version ⚠️⚠️⚠️
Next generation [ØMQ](http://zeromq.org) bindings for Node.js. The goals of this library are:
* Semantically as similar as possible to the [native](https://github.com/zeromq/libzmq) ØMQ library.
* High performance.
* Use modern JavaScript and Node.js features: promises for consumption with `async`/`await`, async iterators (if available at runtime).

**The eventual goal of this library is to be merged back into [ZeroMQ.js](https://github.com/zeromq/zeromq.js).**

# Table of contents

* [Installation](#installation)
* [Examples](#examples)
   * [Push/Pull](#pushpull)
   * [Pub/Sub](#pubsub)
* [Contribution](#contribution)
* [API Documentation](#api-documentation)
   * [Compatibility layer for ZeroMQ.js 4](#compatibility-layer-for-zeromqjs-4)
   * [Class: zmq.Socket](#class-zmqsocket)
     * [socket api](#new-socket)
     * [socket options](#socket-options)
   * [Class: zmq.Context](#class-zmqcontext)
     * [context api](#new-context)
     * [context options](#socket-options)
   * [Class: zmq.Observer](#class-zmqobserver)
     * [observer api](#new-observer)
     * [observer events](#observer-events)
   * [Class: zmq.Proxy](#class-zmqproxy)
   * [Function: zmq.curveKeyPair()](#function-zmqcurvekeypair)
   * [Property: zmq.capability](#property-zmqcapability)
   * [Property: zmq.global](#property-zmqglobal)
   * [Property: zmq.version](#property-zmqversion)


# Installation

Install ZeroMQ.js NG with prebuilt binaries:

```sh
npm install zeromq-ng
```

Requirements for prebuilt binaries:

* Node.js 8.6+ (requires [N-API](https://nodejs.org/api/n-api.html))

To link against a shared library on your system:

```sh
npm install zeromq-ng --zmq-shared
```

Make sure you have the following installed before attempting to build against a shared library:

* A working C/C++ compiler toolchain with make
* Python 2 (2.7 recommended, 3+ does not work)
* ZeroMQ 4.0+ with development headers
* Node.js 8.6+

# Examples


More examples can be found in the [examples directory](examples).

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


# Contribution


## Dependencies

In order to develop and test the library, you'll need the following:

* A working C/C++ compiler toolchain with make
* Python 2.7
* Node.js 8.6+
* CMake 2.8+
* curl
* clang-format is strongly recommended


## Testing

The test suite can be run with:

```sh
npm install
npm run dev:configure
npm run dev:test
```

The test suite will validate and fix the coding style, run all unit tests and verify the validity of the included TypeScript type definitions.

Some tests are not enabled by default:

* API Compatibility tests from ZeroMQ 4.x have been disabled because they sometimes hang. There are likely a few timing issues in the tests or in the compatibility layer implementation. You can include the tests with `INCLUDE_COMPAT_TESTS=1 npm run dev:test`
* Garbage collection tests that use the [weak](https://www.npmjs.com/package/weak) module have been disabled because they suffer from occasional crashes because of the unpredictable nature of the weak package. You can include the tests with `INCLUDE_GC_TESTS=1 npm run dev:test`.
* Some transports are not reliable on some older versions of ZeroMQ, the relevant tests will be skipped for those versions automatically.


## Publishing

To publish a new version, run:

```sh
npm version <new version>
git push --tags
```

After continuous integration successfully finishes running the tests, the prebuilt binaries will be automatically published. Afterwards a new library version will be pushed to NPM.


# API Documentation


## Compatibility layer for ZeroMQ.js 4

The next generation version of the library features an experimental compatibility layer for ZeroMQ.js 4. This is recommended for users upgrading from existing versions.

Example:

```js
const zmq = require("zeromq-ng/compat")

const pub = zmq.socket("pub")
const sub = zmq.socket("sub")

pub.bind("tcp://*:3456", err => {
  if (err) throw err

  sub.connect("tcp://127.0.0.1:3456")

  pub.send("message")

  sub.on("message", msg => {
    // Handle received message...
  })
})
```


## Class: zmq.Socket

A ØMQ socket. This class should generally not be used directly. Instead, create one of its subclasses that corresponds to the socket type you want to use.


### new Socket()

Create a new socket by calling any of the child class constructors. Each subclass corresponds to a ØMQ socket type:

* **Arguments** <br/>
  `options` <[Object]> An optional object with options that will be set on the socket. Any option setter can be used.

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
new zmq.Reply(...)
new zmq.Dealer(...)
new zmq.Router(...)
new zmq.Pull(...)
new zmq.Push(...)
new zmq.XPublisher(...)
new zmq.XSubscriber(...)
new zmq.Stream(...)
```


### socket.bind()

Binds the socket to the given address. During `bind()` the socket cannot be used. Do not call any other methods until the returned promise resolves. Make sure to use `await`.

* **Arguments** <br/>
  `address` <[string]> Address to bind this socket to.

* **Returns** <br/>
  <[Promise]> Resolved when the socket was successfully bound.


```js
await socket.bind("tcp://*:3456")
```


### socket.unbind()

Unbinds the socket to the given address. During `unbind()` the socket cannot be used. Do not call any other methods until the returned promise resolves. Make sure to use `await`.

* **Arguments** <br/>
  `address` <[string]> Address to unbind this socket from.

* **Returns** <br/>
  <[Promise]> Resolved when the socket was successfully unbound.


```js
await socket.bind("tcp://*:3456")
```


### socket.connect()

Starts a new connection to the socket at the given address and returns immediately. The connection will be made asynchronously in the background.

* **Arguments** <br/>
  `address` <[string]> Address to connect this socket to.
  `options` <[Object]> An optional object with options that will be used during the connect phase (see below).

* **Returns** <br/>
  <[undefined]>


```js
socket.connect("tcp://127.0.0.1:3456")
```

```js
const socket = new zmq.Router
socket.connect("tcp://127.0.0.1:3456", {routingId: "remote_id"})
```

### socket connect options

* **routingId** (connect option, on `Router` or `Stream` sockets only) – corresponds to ZMQ_CONNECT_ROUTING_ID socket option<br/>
  <[string] | [Buffer]> Sets the peer identity of the host connected to and immediately readies that connection for data transfer with the named identity. This option applies only to the current call to `connect()`. Connections thereafter use default behaviour.

  Typical use is to set this socket option on each `connect()` attempt to a new host. Each connection MUST be assigned a unique name. Assigning a name that is already in use is not allowed.

  Useful when connecting `Router` to `Router`, or `Stream` to `Stream`, as it allows for immediate sending to peers. Outbound ID framing requirements for `Router` and `Stream` sockets apply.

  The peer identity should be from 1 to 255 bytes long and MAY NOT start with binary zero.


### socket.disconnect()

Disconnects a previously connected socket from the given address. Disonnection will happen asynchronously in the background.

* **Arguments** <br/>
  `address` <[string]> Address to disconnect this socket from.

* **Returns** <br/>
  <[undefined]>


```js
socket.disconnect("tcp://127.0.0.1:3456")
```


### socket.send()

Sends a single message or a multipart message on the socket. Queues the message immediately if possible, and returns a resolved promise. If the message cannot be queued because the high water mark has been reached, it will wait asynchronously. The promise will be resolved when the message was queued successfully.

Queueing may fail eventually if the socket has been configured with a send timeout.

A call to `send()` is guaranteed to return with a resolved promise immediately if the message could be queued directly.

Only **one** asynchronously blocking call to `send()` may be executed simultaneously. If you call `send()` again on a socket that is in the mute state it will return a rejected promise with `EAGAIN`.

The reason for disallowing multiple `send()` calls simultaneously is that it could create an implicit queue of unsendable outgoing messages. This would circumvent the socket's high water mark. Such an implementation could even exhaust all system memory and cause the Node.js process to abort.

For most application you should not notice this implementation detail. Only in rare occasions will a call to `send()` that does not resolve immediately be undesired. Here are some common scenarios:

* If you wish to **send a message**, use `await send(...)`. ZeroMQ socket types have been carefully designed to give you the correct blocking behaviour on the chosen socket type in almost all cases:

  * If sending is not possible, it is often better to wait than to continue as if nothing happened.

    For example, on a `Request` socket, you can only receive a reply once a message has been sent; so waiting until a message could be queued before continuing with the rest of the program (likely to read from the socket) is required.

  * Certain socket types (such as `Router`) will always allow queueing messages and `await send(...)` won't delay any code that comes after. This makes sense for routers, since typically you don't want a single send operation to stop the handling of other incoming or outgoing messages.

* If you wish to send on an occasionally **blocking** socket (for example on a `Router` with the `mandatory` option set, or on a `Dealer`) and you're 100% certain that **dropping a message is better than blocking**, then you can set the `sendTimeout` option to `0` to effectively force `send()` to always resolve immediately. Be prepared to catch or log exceptions if sending a message is not possible right now.

* If you wish to send on a socket and **messages should be queued before they are dropped**, you should implement a [simple queue](examples/queue/queue.ts) in JavaScript. Such a queue is not provided by this library because most real world applications need to deal with undeliverable messages in more complex ways – for example, they might need to reply with a status message; or first retry delivery a certain number of times before giving up.

**Note:** Due to the nature of Node.js and to avoid blocking the main thread, this method always sends messages with the `ZMQ_DONTWAIT` flag. It polls asynchronously if sending is not currently possible. This means that all functionality related to timeouts and blocking behaviour is reimplemented in the Node.js bindings. Any differences in behaviour with the native ZMQ library is considered a bug.

* **Arguments** <br/>
  `message` <[string]> | <[Buffer]> | <[Array]<[string] | [Buffer]> Single message or multipart message to queue for sending.

* **Returns** <br/>
  <[Promise]> Resolved when the message was successfully queued.


```js
await socket.send("hello world")
await socket.send(["hello", "world"])
```


### socket.receive()

Waits for the next single or multipart message to become availeble on the socket. Reads a message immediately if possible. If no messages can be read, it will wait asynchonously. The promise will be resolved with an array containing the parts of the next message when available.

Reading may fail eventually if the socket has been configured with a receive timeout.

A call to `receive()` is guaranteed to return with a resolved promise immediately if a message could be read from the socket directly.

Only **one** asynchronously blocking call to `receive()` can be in progress simultaneously. If you call `receive()` again on the same socket it will return a rejected promise with `EAGAIN`. For example, if no messages can be read and no `await` is used:

```js
socket.receive() // -> pending promise until read is possible
socket.receive() // -> promise rejection with `EAGAIN`
```

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

Sockets that go out of scope and have no `receive()` or `send()` operations in progress will automatically be closed. Therefore it is not necessary in most applications to call `close()` manually.

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


### subscriber.subscribe()

Available on `Subscriber` subclasses only.

Establish a new message filter on a `Subscriber` socket. Newly created `Subscriber` sockets shall filter out all incoming messages, therefore you should call this method to establish an initial message filter.

* **Arguments** <br/>
  `filter` <[string]>... Any number of filters. Multiple filters may be attached to a single socket, in which case a message shall be accepted if it matches at least one filter. Subscribing without any filters shall subscribe to all incoming messages.

* **Returns** <br/>
  <[undefined]>


```js
subscriber.subscribe()
subscriber.subscribe("foo", "bar")
```


### subscriber.unsubscribe()

Available on `Subscriber` subclasses only.

Remove an existing message filter on a `Subscriber` socket. Any filters specified must match an existing filter previously established with `subscribe()`.

* **Arguments** <br/>
  `filter` <[string]>... Any number of filters to remove. Unsubscribing without any filters shall unsubscribe from the "subscribe all" filter that is added by calling `subscribe()` without arguments.

* **Returns** <br/>
  <[undefined]>


```js
subscriber.unsubscribe()
subscriber.unsubscribe("foo", "bar")
```


### socket.events

* **Returns** <br/>
  <[Observer]> Event observer for this socket. This starts up a ZMQ monitoring socket internally that receives all socket events.


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

* **connectTimeout** – ZMQ_CONNECT_TIMEOUT <br/>
  <[number]> Sets how long to wait before timing-out a connect() system call. The connect() system call normally takes a long time before it returns a time out error. Setting this option allows the library to time out the call at an earlier interval.

* **conflate** (write only, on `Pull`, `Push`, `Subscriber`, `Publisher` or `Dealer` sockets only) – ZMQ_CONFLATE <br/>
  <[boolean]> If set to `true`, a socket shall keep only one message in its inbound/outbound queue: the last message to be received/sent. Ignores any high water mark options. Does not support multi-part messages – in particular, only one part of it is kept in the socket internal queue.

* **correlate** (write only, on `Request` sockets only) – ZMQ_REQ_CORRELATE <br/>
  <[boolean]> The default behaviour of `Request` sockets is to rely on the ordering of messages to match requests and responses and that is usually sufficient. When this option is set to `true` the socket will prefix outgoing messages with an extra frame containing a request id. That means the full message is `[<request id>, `null`, user frames…]`. The `Request` socket will discard all incoming messages that don't begin with these two frames.

* **handover** (write only, on `Router` sockets only) – ZMQ_ROUTER_HANDOVER <br/>
  <[boolean]> If two clients use the same identity when connecting to a `Router`, the results shall depend on the this option. If it set to `false` (default), the `Router` socket shall reject clients trying to connect with an already-used identity. If it is set to `true`, the `Router` socket shall hand-over the connection to the new client and disconnect the existing one.

* **handshakeInterval** – ZMQ_HANDSHAKE_IVL <br/>
  <[number]> Handshaking is the exchange of socket configuration information (socket type, identity, security) that occurs when a connection is first opened (only for connection-oriented transports). If handshaking does not complete within the configured time, the connection shall be closed. The value 0 means no handshake time limit.

* **heartbeatInterval** – ZMQ_HEARTBEAT_IVL <br/>
  <[number]> Interval in milliseconds between sending ZMTP heartbeats for the specified socket. If this option is greater than 0, then a PING ZMTP command will be sent after every interval.

* **heartbeatTimeout** – ZMQ_HEARTBEAT_TIMEOUT <br/>
  <[number]> How long (in milliseconds) to wait before timing-out a connection after sending a PING ZMTP command and not receiving any traffic. This option is only valid if `heartbeatInterval` is greater than 0. The connection will time out if there is no traffic received after sending the PING command. The received traffic does not have to be a PONG command - any received traffic will cancel the timeout.

* **heartbeatTimeToLive** – ZMQ_HEARTBEAT_TTL <br/>
  <[number]> The timeout in milliseconds on the remote peer for ZMTP heartbeats. If this option is greater than 0, the remote side shall time out the connection if it does not receive any more traffic within the TTL period. This option does not have any effect if `heartbeatInterval` is 0. Internally, this value is rounded down to the nearest decisecond, any value less than 100 will have no effect.

* **immediate** – ZMQ_IMMEDIATE <br/>
  <[boolean]> By default queues will fill on outgoing connections even if the connection has not completed. This can lead to "lost" messages on sockets with round-robin routing (`Req`, `Push`, `Dealer`). If this option is set to `true`, messages shall be queued only to completed connections. This will cause the socket to block if there are no other connections, but will prevent queues from filling on pipes awaiting connection.

* **interface** – ZMQ_BINDTODEVICE
  <[string] | [Buffer]> Binds the socket to the given network interface (Linux only). Allows to use Linux VRF, see: https://www.kernel.org/doc/Documentation/networking/vrf.txt. Requires the program to be ran as root **or** with `CAP_NET_RAW`.

* **invertMatching** (on `Publisher`, `Subscriber` or `XPublisher` sockets only) – ZMQ_INVERT_MATCHING
  <[boolean]> On `Publisher` and `XPublisher` sockets, this causes messages to be sent to all connected sockets except those subscribed to a prefix that matches the message. On `Subscriber` sockets, this causes only incoming messages that do not match any of the socket's subscriptions to be received by the user.

  Whenever this is set to `true` on a `Publisher` socket, all `Subscriber` sockets connecting to it must also have the option set to `true`. Failure to do so will have the `Subsriber` sockets reject everything the `Publisher` socket sends them. `XSubscriber` sockets do not need to do this because they do not filter incoming messages.

* **ipv6** – ZMQ_IPV6 <br/>
  <[boolean]> Enable or disable IPv6. When IPv6 is enabled, the socket will connect to, or accept connections from, both IPv4 and IPv6 hosts.

* **lastEndpoint** (read only) – ZMQ_LAST_ENDPOINT <br/>
  <[string]> The last endpoint bound for TCP and IPC transports.

* **linger** – ZMQ_LINGER <br/>
  <[number]> Determines how long pending messages which have yet to be sent to a peer shall linger in memory after a socket is closed with `close()`.

* **mandatory** (on `Router` sockets only) – ZMQ_ROUTER_MANDATORY <br/>
  <[boolean]> A value of `false` is the default and discards the message silently when it cannot be routed or the peer's high water mark is reached. A value of `true` causes `send()` to fail if it cannot be routed, or wait asynchronously if the high water mark is reached.

* **manual** (write only, on `XPublisher` sockets only) – ZMQ_XPUB_MANUAL <br/>
  <[boolean]> Sets the `XPublisher` socket subscription handling mode to manual/automatic. A value of `true` will change the subscription requests handling to manual.

* **maxMessageSize** – ZMQ_MAXMSGSIZE <br/>
  <[number]> Limits the size of the inbound message. If a peer sends a message larger than the limit it is disconnected. Value of -1 means no limit.

* **multicastHops** – ZMQ_MULTICAST_HOPS <br/>
  <[number]> Sets the time-to-live field in every multicast packet sent from this socket. The default is 1 which means that the multicast packets don't leave the local network.

* **multicastMaxTransportDataUnit** – ZMQ_MULTICAST_MAXTPDU <br/>
  <[number]> Sets the maximum transport data unit size used for outbound multicast packets. This must be set at or below the minimum Maximum Transmission Unit (MTU) for all network paths over which multicast reception is required.

* **noDrop** (write only, on `XPublisher` or `Publisher` sockets only) – ZMQ_XPUB_NODROP <br/>
  <[boolean]> Sets the `XPublisher` socket behaviour to return an error if the high water mark is reached and the message could not be send. The default is to drop the message silently when the peer high water mark is reached.

* **notify** (write only, on `Stream` sockets only) – ZMQ_STREAM_NOTIFY <br/>
  <[boolean]> Enables connect and disconnect notifications on a `Stream` when set to `true`. When notifications are enabled, the socket delivers a zero-length message when a peer connects or disconnects.

* **probeRouter** (write only, on `Router`, `Dealer` or `Request` sockets only)– ZMQ_PROBE_ROUTER <br/>
  <[boolean]> When set to `true`, the socket will automatically send an empty message when a new connection is made or accepted. You may set this on sockets connected to a `Router` socket. The application must filter such empty messages. This option provides the `Router` application with an event signaling the arrival of a new peer.

  **Warning:** Do not set this option on a socket that talks to any other socket type except `Router`: the results are undefined.

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

* **relaxed** (write only, on `Request` sockets only) – ZMQ_REQ_RELAXED <br/>
  <[boolean]> By default, a `Request` socket does not allow initiating a new request with until the reply to the previous one has been received. When set to `true`, sending another message is allowed and previous replies will be discarded. The request-reply state machine is reset and a new request is sent to the next available peer.

  **Note:** If set to `true`, also enable `correlate` to ensure correct matching of requests and replies. Otherwise a late reply to an aborted request can be reported as the reply to the superseding request.

* **routingId** (on `Request`, `Reply`, `Router` or `Dealer` sockets only)– ZMQ_ROUTING_ID <br/>
  <[string] | [Buffer]> The identity of the specified socket when connecting to a `Router` socket.

* **sendBufferSize** – ZMQ_SNDBUF <br/>
  <[number]> Underlying kernel transmit buffer size in bytes. A value of -1 means leave the OS default unchanged.

* **sendHighWaterMark** – ZMQ_SNDHWM <br/>
  <[number]> The high water mark is a hard limit on the maximum number of outgoing messages ØMQ shall queue in memory for any single peer that the specified socket is communicating with. A value of zero means no limit.

  If this limit has been reached the socket shall enter an exceptional state and depending on the socket type, ØMQ shall take appropriate action such as blocking or dropping sent messages.

* **sendTimeout** – ZMQ_SNDTIMEO <br/>
  <[number]> Sets the timeout for sending messages on the socket. If the value is 0, `send()` will return a rejected promise immediately if the message cannot be sent. If the value is -1, it will wait asynchronously until the message is sent. For all other values, it will try to send the message for that amount of time before rejecting.

* **socksProxy** – ZMQ_SOCKS_PROXY <br/>
  <[string]> The SOCKS5 proxy address that shall be used by the socket for the TCP connection(s). Does not support SOCKS5 authentication. If the endpoints are domain names instead of addresses they shall not be resolved and they shall be forwarded unchanged to the SOCKS proxy service in the client connection request message (address type 0x03 domain name).

* **tcpAcceptFilter** – ZMQ_TCP_ACCEPT_FILTER <br/>
  <[string]> Assign a filter that will be applied for each new TCP transport connection on a listening socket. If no filters are applied, then the TCP transport allows connections from any IP address. If at least one filter is applied then new connection source IP should be matched. To clear all filters set to `null`. Filter is a string with IPv6 or IPv4 CIDR.

* **tcpKeepalive** – ZMQ_TCP_KEEPALIVE <br/>
  <[number]> Override SO_KEEPALIVE socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveCount** – ZMQ_TCP_KEEPALIVE_CNT <br/>
  <[number]> Overrides TCP_KEEPCNT socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveIdle** – ZMQ_TCP_KEEPALIVE_IDLE <br/>
  <[number]> Overrides TCP_KEEPIDLE / TCP_KEEPALIVE socket option (if supported by OS). The default value of -1 leaves it to the OS default.

* **tcpKeepaliveInterval** – ZMQ_TCP_KEEPALIVE_INTVL <br/>
  <[number]> Overrides TCP_KEEPINTVL socket option (if supported by the OS). The default value of -1 leaves it to the OS default.

* **tcpMaxRetransmitTimeout** – ZMQ_TCP_MAXRT <br/>
  <[number]> Sets how long before an unacknowledged TCP retransmit times out (if supported by the OS). The system normally attempts many TCP retransmits following an exponential backoff strategy. This means that after a network outage, it may take a long time before the session can be re-established. Setting this option allows the timeout to happen at a shorter interval.

* **threadSafe** (read only) – ZMQ_THREAD_SAFE <br/>
  <[boolean]> Whether or not the socket is threadsafe. Currently `Client` and `Server` draft sockets are threadsafe.

* **type** (read only) – ZMQ_TYPE <br/>
  <[number]> Retrieve the socket type. This is fairly useless because you can inspect the JavaScript constructor with `socket.constructor`.

* **typeOfService** – ZMQ_TOS <br/>
  <[number]> Sets the ToS fields (the *Differentiated Services* (DS) and *Explicit Congestion Notification* (ECN) field) of the IP header. The ToS field is typically used to specify a packet's priority. The availability of this option is dependent on intermediate network equipment that inspect the ToS field and provide a path for low-delay, high-throughput, highly-reliable service, etc.

* **verbose** (write only, on `XPublisher` sockets only) – ZMQ_XPUB_VERBOSE <br/>
  <[boolean]> If set to `true` the socket passes all subscribe messages to the caller. If set to `false` (default) these are not visible to the caller.

* **verboser** (write only, on `XPublisher` sockets only) – ZMQ_XPUB_VERBOSER <br/>
  <[boolean]>If set to `true` the socket passes all subscribe **and** unsubscribe messages to the caller. If set to `false` (default) these are not visible to the caller.

* **vmciBufferSize** – ZMQ_VMCI_BUFFER_SIZE <br/>
  <[number]> The size of the underlying buffer for the socket. Used during negotiation before the connection is established.

* **vmciBufferMinSize** – ZMQ_VMCI_BUFFER_MIN_SIZE <br/>
  <[number]> Minimum size of the underlying buffer for the socket. Used during negotiation before the connection is established.

* **vmciBufferMaxSize** – ZMQ_VMCI_BUFFER_MAX_SIZE <br/>
  <[number]> Maximum size of the underlying buffer for the socket. Used during negotiation before the connection is established.

* **vmciConnectTimeout** – ZMQ_VMCI_CONNECT_TIMEOUT <br/>
  <[number]> Connection timeout for the socket.

* **welcomeMessage** (write only, on `XPublisher` sockets only) – ZMQ_XPUB_WELCOME_MSG <br/>
  <[string]> Sets a welcome message that will be recieved by subscriber when connecting. Subscriber must subscribe to the welcome message before connecting. For welcome messages to work well, poll on incoming subscription messages on the `XPublisher` socket and handle them.



### socket security options

Listed below are all socket options that are related to setting and retrieving the security mechanism.

* **curveServer** – ZMQ_CURVE_SERVER <br/>
  <[boolean]> Defines whether the socket will act as server for CURVE security. A value of `true` means the socket will act as CURVE server. A value of `false` means the socket will not act as CURVE server, and its security role then depends on other option settings.

* **curveSecretKey** – ZMQ_CURVE_SECRETKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term secret key. You must set this on both CURVE client and server sockets. You can create a new keypair with `zmq.curveKeyPair()`.

* **curvePublicKey** – ZMQ_CURVE_PUBLICKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term public key. You must set this on CURVE client sockets. A server socket does not need to know its own public key. You can create a new keypair with `zmq.curveKeyPair()`.

* **curveServerKey** – ZMQ_CURVE_SERVERKEY <br/>
  <[string] | [Buffer]> Sets the socket's long term server key. This is the public key of the CURVE *server* socket. You must set this on CURVE *client* sockets. This key must have been generated together with the server's secret key. You can create a new keypair with `zmq.curveKeyPair()`.

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

* **zapDomain** – ZMQ_ZAP_DOMAIN <br/>
  <[string]> Sets the domain for ZAP (ZMQ RFC 27) authentication. For NULL security (the default on all tcp:// connections), ZAP authentication only happens if you set a non-empty domain. For PLAIN and CURVE security, ZAP requests are always made, if there is a ZAP handler present. See http://rfc.zeromq.org/spec:27 for more details.


## Class: zmq.Context

A ØMQ context.


### new Context

Creates a new ØMQ context. It is usually not necessary to instantiate a new context – the global context `zmq.global` is used for new sockets by default.

* **Arguments** <br/>
  `options` <[Object]> An optional object with options that will be set on the context. Any option setter can be used.

* **Returns** <br/>
  <[Context]> New context.


```js
const zmq = require("zeromq-ng")
const context = new zmq.Context({ioThreads: 5})
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

An event observer for ØMQ sockets. This starts up a ZMQ monitoring socket internally that receives all socket events. The event observer can be used in one of two ways, which are **mutually exclusive**:

* By consuming events with `receive()`.
* By attaching event handlers (like a classic Node.js event emitter).


### new Observer

Creates a new ØMQ observer. It is usually not necessary to instantiate a new observer. Access an existing observer for a socket with `socket.events`.

* **Arguments** <br/>
  `socket` <[Socket]> The socket to observe.

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
  `event` <[string]> The name of the event.

  `listener` <[Function] (<[Object]>)> The callback function. The function will be invoked with an object with [additional details](#observer-events) related to this event. The following property is included for **all events**:

  * `address` <[string]> – The affected endpoint.

* **Returns** <br/>
  <[EventEmitter]> The event emitter instance that the listener was attached on.


```js
socket.events.on("listening", details => {
  console.log(`Socket listening on ${details.address}`)
})
```


### observer.receive()

Waits for the next event to become availeble on the observer. Reads an event immediately if possible. If no events are queued, it will wait asynchonously. The promise will be resolved with an array containing the event name and details of the next event when available.

When reading events with `receive()` the observer **must not be in event emitter** mode. Avoid mixing calls to `receive()` with attached event handlers via `on()`.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Promise]<[[string], [Object]]>> Event name and [additional details](#observer-events) related to this event. The following property is included for **all events**:

  * `address` <[string]> – The affected endpoint.


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

Closes the observer. Calling this method is optional.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>


```js
socket.events.close()
```


### observer events

The following socket events can be generated. This list may be different depending on the ZeroMQ version that is used.

Note that the **error** event is avoided by design, since this has a [special behaviour](https://nodejs.org/api/events.html#events_error_events) in Node.js causing an exception to be thrown if it is unhandled.

Other error names are adjusted to be as close to possible as other [networking related](https://nodejs.org/api/net.html) event names in Node.js and/or to the corresponding ZeroMQ.js method call. Events (including any errors) that correspond to a specific operation are namespaced with a colon `:`, e.g. `bind:error` or `connect:retry`.

* **accept** – ZMQ_EVENT_ACCEPTED <br/>
  The socket has accepted a connection from a remote peer.

* **accept:error** – ZMQ_EVENT_ACCEPT_FAILED <br/>
  The socket has rejected a connection from a remote peer.

  The following additional details will be included with this event:

  * `error` <[Error]> – An error object that describes the specific error that occurred.

* **bind** – ZMQ_EVENT_LISTENING <br/>
  The socket was successfully bound to a network interface.

* **bind:error** – ZMQ_EVENT_BIND_FAILED <br/>
  The socket could not bind to a given interface.

  The following additional details will be included with this event:

  * `error` <[Error]> – An error object that describes the specific error that occurred.

* **connect** – ZMQ_EVENT_CONNECTED <br/>
  The socket has successfully connected to a remote peer.

* **connect:delay** – ZMQ_EVENT_CONNECT_DELAYED <br/>
  A connect request on the socket is pending.

* **connect:retry** – ZMQ_EVENT_CONNECT_RETRIED <br/>
  A connection attempt is being handled by reconnect timer. Note that the reconnect interval is recalculated at each retry.

  The following additional details will be included with this event:

  * `interval` <[number]> – The current reconnect interval.

* **close** – ZMQ_EVENT_CLOSED <br/>
  The socket was closed.

* **close:error** – ZMQ_EVENT_CLOSE_FAILED <br/>
  The socket close failed. Note that this event occurs **only on IPC** transports..

  The following additional details will be included with this event:

  * `error` <[Error]> – An error object that describes the specific error that occurred.

* **disconnect** – ZMQ_EVENT_DISCONNECTED <br/>
  The socket was disconnected unexpectedly.

* **handshake** – ZMQ_EVENT_HANDSHAKE_SUCCEEDED <br/>
  The ZMTP security mechanism handshake succeeded. NOTE: This event may still be in DRAFT statea and not yet available in stable releases.

* **handshake:error:protocol** – ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL <br/>
  The ZMTP security mechanism handshake failed due to some mechanism protocol
  error, either between the ZMTP mechanism peers, or between the mechanism
  server and the ZAP handler. This indicates a configuration or implementation
  error in either peer resp. the ZAP handler. NOTE: This event may still be in DRAFT state and not yet available in stable releases.

* **handshake:error:auth** – ZMQ_EVENT_HANDSHAKE_FAILED_AUTH <br/>
  The ZMTP security mechanism handshake failed due to an authentication failure. NOTE: This event may still be in DRAFT state and not yet available in stable releases.

* **handshake:error:other** – ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL <br/>
  Unspecified error during handshake. NOTE: This event may still be in DRAFT state and not yet available in stable releases.

* **end** – ZMQ_EVENT_MONITOR_STOPPED <br/>
  Monitoring on this socket ended.

* **unknown** <br/>
  An event was generated by ZeroMQ that the Node.js library could not interpret. Please submit a pull request for new event types if they are not yet included.


## Class: zmq.Proxy

Proxy messages between two ØMQ sockets. The proxy connects a frontend socket to a backend socket. Conceptually, data flows from frontend to backend. Depending on the socket types, replies may flow in the opposite direction. The direction is conceptual only; the proxy is fully symmetric and there is no technical difference between frontend and backend.

[Review the ØMQ documentation](http://api.zeromq.org/4-2:zmq-proxy#toc3) for an overview of example usage.


### new Proxy

Creates a new ØMQ proxy.

* **Arguments** <br/>
  `frontEnd` <[Socket]> The front-end socket to proxy.

  `backEnd` <[Socket]> The back-end socket to proxy.

* **Returns** <br/>
  <[Proxy]> New proxy for the given sockets.


```js
const zmq = require("zeromq-ng")
const proxy = new zmq.Proxy(new zmq.Router, new zmq.Dealer)
```


### proxy.run()

Starts the proxy loop in a worker thread and waits for its termination. Before calling `run()` you must set any socket options, and connect or bind both front-end and back-end sockets.

On termination the front-end and back-end sockets will be closed automatically.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Promise]> Resolved when the proxy terminates.


```js
await proxy.frontEnd.bind("tcp://*:3001")
await proxy.backEnd.bind("tcp://*:3002")
await proxy.run()
```


### proxy.pause()

Temporarily suspends any proxy activity. Resume activity with `resume()`.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>

```js
proxy.pause()
```


### proxy.resume()

Resumes proxy activity after suspending it with `pause()`.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>

```js
proxy.resume()
```


### proxy.terminate()

Gracefully shuts down the proxy. The front-end and back-end sockets will be closed automatically. There might be a slight delay between calling `terminate()` and the `run()` method resolving.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[undefined]>

```js
const done = proxy.run()
proxy.terminate()
await done
```


### proxy.frontEnd

* **Returns** <br/>
  <[Socket]> The front-end socket passed to the constructor. Will be closed after the `run()` method resolves.


### proxy.backEnd

* **Returns** <br/>
  <[Socket]> The back-end socket passed to the constructor. Will be closed after the `run()` method resolves.


## Function: zmq.curveKeyPair()

Returns a new random key pair to be used with the CURVE security mechanism.

* **Arguments** <br/>
  (none)

* **Returns** <br/>
  <[Object]> An object that contains the keypair as two properties
  * `publicKey` <[string]> – 40 character Z85-encoded string that contains the public key.
  * `secretKey` <[string]> – 40 character Z85-encoded string that contains the corresponding private key.


To correctly connect two sockets with the CURVE security mechanism:

* Generate a **client** keypair with `zmq.curveKeyPair()`.
  * Assign the private and public key on the client socket with `socket.curveSecretKey` and `socket.curvePublicKey`.
* Generate a **server** keypair with `zmq.curveKeyPair()`.
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
[Error]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[Function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[null]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null "null"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[Observer]: #class-zmqobserver "zmq.Observer"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
[Proxy]: #class-zmqproxy "zmq.Proxy"
[Socket]: #class-zmqsocket "zmq.Socket"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "string"
[undefined]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined "undefined"
