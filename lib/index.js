/* Check for presence of required global functions before loading native
   extension; it has no error handling for their absence. */
if (typeof Object.seal !== "function") throw new ReferenceError("Object.seal")
if (typeof Object.assign !== "function") throw new ReferenceError("Object.assign")
if (typeof process.emitWarning !== "function") throw new ReferenceError("process.emitWarning")

const path = require("path")
const binary = require("node-gyp-build")(path.join(__dirname, ".."))
const {Context, Socket, Observer, capability} = module.exports = binary

/* Meta function to define new socket/context options. */
function defineOption(id, type, name, {read = true, write = true, on = this, values = null} = {}) {
  let get, set

  if (read) {
    if (values) {
      get = function get() {
        return values[this[`get${type}Option`](id)]
      }
    } else {
      get = function get() {
        return this[`get${type}Option`](id)
      }
    }
  }

  if (write) {
    if (values) {
      set = function set(val) {
        this[`set${type}Option`](id, values.indexOf(val))
      }
    } else {
      set = function set(val) {
        this[`set${type}Option`](id, val)
      }
    }
  }

  if (!Array.isArray(on)) on = [on]

  for (const target of on) {
    Object.defineProperty(target.prototype, name, {get, set})
  }
}

Object.defineProperty(Context, "defineOption", {value: defineOption})
Object.defineProperty(Socket, "defineOption", {value: defineOption})

/* Context options. NOTE: ALSO include any options in index.d.ts. */
Context.defineOption(1, "Int32", "ioThreads")
Context.defineOption(2, "Int32", "maxSockets")
Context.defineOption(3, "Int32", "maxSocketsLimit", {write: false})
Context.defineOption(3, "Int32", "threadPriority", {read: false})
Context.defineOption(4, "Int32", "threadSchedulingPolicy", {read: false})
Context.defineOption(5, "Int32", "maxMessageSize")
/* This option is fairly useless in JS. */
/* Context.defineOption(6, "Int32", "msgTSize") */
/* These options should be methods. */
/* Context.defineOption(7, "Int32", "threadAffinityCpuAdd") */
/* Context.defineOption(8, "Int32", "threadAffinityCpuRemove") */
/* To be released in a new ZeroMQ version. */
/* if (Context.prototype.setStringOption) {
  Context.defineOption(9, "String", "threadNamePrefix")
} */
/* There should be no reason to change this in JS. */
/* Context.defineOption(10, "Bool", "zeroCopyRecv") */

Context.defineOption(42, "Bool", "ipv6")
Context.defineOption(70, "Bool", "blocky")

/* Socket types. */
class Pair extends Socket {
  constructor(options) { super(0, options) }
}

class Publisher extends Socket {
  constructor(options) { super(1, options) }
}

class Subscriber extends Socket {
  constructor(options) { super(2, options) }
}

class Request extends Socket {
  constructor(options) { super(3, options) }
}

class Reply extends Socket {
  constructor(options) { super(4, options) }
}

class Dealer extends Socket {
  constructor(options) { super(5, options) }
}

class Router extends Socket {
  constructor(options) { super(6, options) }

  connect(address, options = {}) {
    if (options.routingId) {
      this.setStringOption(61, options.routingId)
    }

    super.connect(address)
  }
}

class Pull extends Socket {
  constructor(options) { super(7, options) }
}

class Push extends Socket {
  constructor(options) { super(8, options) }
}

class XPublisher extends Socket {
  constructor(options) { super(9, options) }
}

class XSubscriber extends Socket {
  constructor(options) { super(10, options) }
}

class Stream extends Socket {
  constructor(options) { super(11, options) }

  connect(address, options = {}) {
    if (options.routingId) {
      this.setStringOption(61, options.routingId)
    }

    super.connect(address)
  }
}

/* Socket options. NOTE: ALSO include any options in index.d.ts. */
Socket.defineOption(4, "Uint64", "affinity")
Socket.defineOption(5, "String", "routingId", {on: [Request, Reply, Router, Dealer]})
Socket.defineOption(8, "Int32", "rate")
Socket.defineOption(9, "Int32", "recoveryInterval")
Socket.defineOption(11, "Int32", "sendBufferSize")
Socket.defineOption(12, "Int32", "receiveBufferSize")
Socket.defineOption(16, "Int32", "type", {write: false})
Socket.defineOption(17, "Int32", "linger")
Socket.defineOption(18, "Int32", "reconnectInterval")
Socket.defineOption(19, "Int32", "backlog")
Socket.defineOption(21, "Int32", "reconnectMaxInterval")
Socket.defineOption(22, "Int64", "maxMessageSize")
Socket.defineOption(23, "Int32", "sendHighWaterMark")
Socket.defineOption(24, "Int32", "receiveHighWaterMark")
Socket.defineOption(25, "Int32", "multicastHops")
Socket.defineOption(27, "Int32", "receiveTimeout")
Socket.defineOption(28, "Int32", "sendTimeout")
Socket.defineOption(32, "String", "lastEndpoint", {write: false})
Socket.defineOption(33, "Bool", "mandatory", {on: Router})
Socket.defineOption(34, "Int32", "tcpKeepalive")
Socket.defineOption(35, "Int32", "tcpKeepaliveCount")
Socket.defineOption(36, "Int32", "tcpKeepaliveIdle")
Socket.defineOption(37, "Int32", "tcpKeepaliveInterval")
Socket.defineOption(38, "String", "tcpAcceptFilter")
Socket.defineOption(39, "Bool", "immediate")
Socket.defineOption(40, "Bool", "verbose", {read: false, on: XPublisher})
Socket.defineOption(42, "Bool", "ipv6")
Socket.defineOption(43, "Int32", "securityMechanism", {write: false, values: [null, "plain", "curve", "gssapi"]})
Socket.defineOption(44, "Bool", "plainServer")
Socket.defineOption(45, "String", "plainUsername")
Socket.defineOption(46, "String", "plainPassword")

if (capability.curve) {
  Socket.defineOption(47, "Bool", "curveServer")
  Socket.defineOption(48, "String", "curvePublicKey")
  Socket.defineOption(49, "String", "curveSecretKey")
  Socket.defineOption(50, "String", "curveServerKey")
}

Socket.defineOption(51, "Bool", "probeRouter", {read: false, on: [Router, Dealer, Request]})
Socket.defineOption(52, "Bool", "correlate", {read: false, on: Request})
Socket.defineOption(53, "Bool", "relaxed", {read: false, on: Request})
Socket.defineOption(54, "Bool", "conflate", {read: false, on: [Pull, Push, Subscriber, Publisher, Dealer]})
Socket.defineOption(55, "String", "zapDomain")
Socket.defineOption(56, "Bool", "handover", {read: false, on: Router})
Socket.defineOption(57, "Uint32", "typeOfService")

if (capability.gssapi) {
  Socket.defineOption(62, "Bool", "gssapiServer")
  Socket.defineOption(63, "String", "gssapiPrincipal")
  Socket.defineOption(64, "String", "gssapiServicePrincipal")
  Socket.defineOption(65, "Bool", "gssapiPlainText")
  Socket.defineOption(90, "Int32", "gssapiPrincipalNameType", {values: ["hostBased", "userName", "krb5Principal"]})
  Socket.defineOption(91, "Int32", "gssapiServicePrincipalNameType", {values: ["hostBased", "userName", "krb5Principal"]})
}

Socket.defineOption(66, "Int32", "handshakeInterval")
Socket.defineOption(68, "String", "socksProxy")
Socket.defineOption(69, "Bool", "noDrop", {read: false, on: [XPublisher, Publisher]})
Socket.defineOption(71, "Bool", "manual", {read: false, on: XPublisher})
Socket.defineOption(72, "String", "welcomeMessage", {read: false, on: XPublisher})
Socket.defineOption(73, "Bool", "notify", {read: false, on: Stream})
Socket.defineOption(74, "Bool", "invertMatching", {on: [Publisher, Subscriber, XPublisher]})
Socket.defineOption(75, "Int32", "heartbeatInterval")
Socket.defineOption(76, "Int32", "heartbeatTimeToLive")
Socket.defineOption(77, "Int32", "heartbeatTimeout")
Socket.defineOption(78, "Bool", "verboser", {read: false, on: XPublisher})
Socket.defineOption(79, "Int32", "connectTimeout")
Socket.defineOption(80, "Int32", "tcpMaxRetransmitTimeout")
Socket.defineOption(81, "Bool", "threadSafe", {read: false})
Socket.defineOption(84, "Int32", "multicastMaxTransportDataUnit")
Socket.defineOption(85, "Uint64", "vmciBufferSize")
Socket.defineOption(86, "Uint64", "vmciBufferMinSize")
Socket.defineOption(87, "Uint64", "vmciBufferMaxSize")
Socket.defineOption(88, "Int32", "vmciConnectTimeout")

/* TODO: verbose/verboser might be better represented as one option that can
   have three states. */

/* Not sure if ZMQ_USE_FD option can be used with Node.js? Haven't been able
   to get it to work in any meaningful way. Feel free to suggest a test case
   and we can add it again. */
/* Socket.defineOption(89, "Int32", "useFd", {read: false}) */
Socket.defineOption(92, "String", "interface")
Socket.defineOption(93, "Bool", "zapEnforceDomain")
Socket.defineOption(94, "Bool", "loopbackFastPath")
/* The following options are still in DRAFT. */
/* Socket.defineOption(95, "String", "metadata") */
/* Socket.defineOption(96, "String", "multicastLoop") */
/* Socket.defineOption(97, "String", "notify", {on: Router}) */
/* Socket.defineOption(98, "String", "manualLastValue", {on: XPublisher}) */
/* Socket.defineOption(99, "String", "socksUsername") */
/* Socket.defineOption(100, "String", "socksPassword") */
/* Socket.defineOption(101, "String", "inBatchSize") */
/* Socket.defineOption(102, "String", "outBatchSize") */

/* Custom properties/methods on various socket types follow... */

Subscriber.prototype.subscribe = function subscribe(...values) {
  if (values.length == 0) {
    this.setStringOption(6, null)
  } else {
    for (const value of values) {
      this.setStringOption(6, value)
    }
  }
}

Subscriber.prototype.unsubscribe = function unsubscribe(...values) {
  if (values.length == 0) {
    this.setStringOption(7, null)
  } else {
    for (const value of values) {
      this.setStringOption(7, value)
    }
  }
}

Object.defineProperty(Observer.prototype, "emitter", {
  get: function emitter() {
    const {EventEmitter} = require("events")
    const value = new EventEmitter

    const receive = this.receive.bind(this)
    Object.defineProperty(this, "receive", {
      get: function receive() {
        throw new Error(
          "Observer is in event emitter mode. " +
          "After a call to events.on() it is not possible to read events with events.receive()."
        )
      },
    })

    const run = async () => {
      while (!this.closed) {
        const [event, data] = await receive()
        value.emit(event, data)
      }
    }

    run()

    Object.defineProperty(this, "emitter", {value})
    return value
  },
})

Observer.prototype.on = function on(...args) {
  return this.emitter.on(...args)
}

/* Support async iteration over received messages. Implementing this in JS
   is faster as long as there is no C++ native API to chain promises. */
function asyncIterator() {
  return {
    next: async () => {
      if (this.closed) {
        return {done: true}
      }

      try {
        return {value: await this.receive(), done: false}
      } catch (err) {
        if (this.closed && err.code == "EAGAIN") {
          return {done: true}
        } else {
          throw err
        }
      }
    },
  }
}

if (Symbol.asyncIterator) {
  Socket.prototype[Symbol.asyncIterator] = asyncIterator
  Observer.prototype[Symbol.asyncIterator] = asyncIterator
}

Object.assign(module.exports, {
  Pair,
  Publisher,
  Subscriber,
  Request,
  Reply,
  Dealer,
  Router,
  Pull,
  Push,
  XPublisher,
  XSubscriber,
  Stream,
})
