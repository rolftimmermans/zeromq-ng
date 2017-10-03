/* Check for presence of required global functions before loading native
   extension; it has no error handling for their absence. */
if (typeof Object.seal !== "function") throw new ReferenceError("Object.seal")
if (typeof Object.assign !== "function") throw new ReferenceError("Object.assign")
if (typeof process.emitWarning !== "function") throw new ReferenceError("process.emitWarning")

module.exports = require("../build/Release/zeromq.node")
const {Context, Socket, capability} = module.exports

/* Meta function to define new socket/context options. */
function defineOption(id, type, names, {read = true, write = true, on = this} = {}) {
  const get = read ?
    function get() { return this[`get${type}Option`](id) } : undefined

  const set = write ?
    function set(val) { this[`set${type}Option`](id, val) } : undefined

  if (!Array.isArray(on)) on = [on]

  for (const name of names) {
    for (const target of on) {
      Object.defineProperty(target.prototype, name, {get, set})
    }
  }
}

Object.defineProperty(Context, "defineOption", {value: defineOption})
Object.defineProperty(Socket, "defineOption", {value: defineOption})

/* Context options. */
Context.defineOption(1, "Int32", ["ioThreads"])
Context.defineOption(2, "Int32", ["maxSockets"])
Context.defineOption(3, "Int32", ["socketLimit", "maxSocketsLimit"], {write: false})
Context.defineOption(3, "Int32", ["threadPriority"], {read: false})
Context.defineOption(4, "Int32", ["threadSchedPolicy", "threadSchedulingPolicy"], {read: false})
Context.defineOption(5, "Int32", ["maxMsgsz", "maxMessageSize"])
Context.defineOption(42, "Bool", ["ipv6"])
Context.defineOption(70, "Bool", ["blocky"])

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

class Response extends Socket {
  constructor(options) { super(4, options) }
}

class Dealer extends Socket {
  constructor(options) { super(5, options) }
}

class Router extends Socket {
  constructor(options) { super(6, options) }
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
}

/* Socket options. */
Socket.defineOption(4, "UInt64", ["affinity"])
Socket.defineOption(5, "String", ["identity", "routingId"], {on: [Request, Response, Router, Dealer]})
Socket.defineOption(8, "Int32", ["rate"])
Socket.defineOption(9, "Int32", ["recoveryIvl", "recoveryInterval"])
Socket.defineOption(11, "Int32", ["sndbuf", "sendBufferSize"])
Socket.defineOption(12, "Int32", ["rcvbuf", "receiveBufferSize"])
Socket.defineOption(16, "Int32", ["type"], {write: false})
Socket.defineOption(17, "Int32", ["linger"])
Socket.defineOption(18, "Int32", ["reconnectIvl", "reconnectInterval"])
Socket.defineOption(19, "Int32", ["backlog"])
Socket.defineOption(21, "Int32", ["reconnectIvlMax", "reconnectMaxInterval"])
Socket.defineOption(22, "Int64", ["maxmsgsize", "maxMessageSize"])
Socket.defineOption(23, "Int32", ["sndhwm", "sendHighWaterMark"])
Socket.defineOption(24, "Int32", ["rcvhwm", "receiveHighWaterMark"])
Socket.defineOption(25, "Int32", ["multicastHops"])
Socket.defineOption(27, "Int32", ["rcvtimeo", "receiveTimeout"])
Socket.defineOption(28, "Int32", ["sndtimeo", "sendTimeout"])
Socket.defineOption(32, "String", ["lastEndpoint"])
Socket.defineOption(33, "Boolean", ["routerMandatory", "mandatory"], {on: Router})
Socket.defineOption(34, "Int32", ["tcpKeepalive"])
Socket.defineOption(35, "Int32", ["tcpKeepaliveCnt", "tcpKeepaliveCount"])
Socket.defineOption(36, "Int32", ["tcpKeepaliveIdle"])
Socket.defineOption(37, "Int32", ["tcpKeepaliveIntvl", "tcpKeepaliveInterval"])
Socket.defineOption(39, "Bool", ["immediate"])
Socket.defineOption(40, "Bool", ["xpubVerbose", "verbose"], {on: XPublisher})
Socket.defineOption(42, "Bool", ["ipv6"])
Socket.defineOption(43, "Int32", ["mechanism"], {write: false})
Socket.defineOption(44, "Bool", ["plainServer"])
Socket.defineOption(45, "String", ["plainUsername"])
Socket.defineOption(46, "String", ["plainPassword"])

if (capability.curve) {
  Socket.defineOption(47, "Bool", ["curveServer"])
  Socket.defineOption(48, "String", ["curvePublickey", "curvePublicKey"])
  Socket.defineOption(49, "String", ["curveSecretkey", "curveSecretKey"])
  Socket.defineOption(50, "String", ["curveServerkey", "curveServerKey"])
}

Socket.defineOption(69, "Bool", ["xpubNodrop", "noDrop"], {on: [XPublisher, Publisher]})
Socket.defineOption(71, "Bool", ["xpubManual", "manual"], {on: XPublisher})
Socket.defineOption(72, "String", ["xpubWelcomeMsg", "welcomeMessage"], {on: XPublisher})
Socket.defineOption(78, "Bool", ["xpubVerboser", "verboser"], {on: XPublisher})
Socket.defineOption(78, "Bool", ["probeRouter"], {on: [Router, Dealer, Request]})
Socket.defineOption(52, "Bool", ["reqCorrelate", "correlate"], {on: Request})
Socket.defineOption(53, "Bool", ["reqRelaxed", "relaxed"], {on: Request})
Socket.defineOption(54, "Bool", ["conflate"], {on: [Pull, Push, Subscriber, Publisher, Dealer]})
Socket.defineOption(55, "String", ["zapDomain"])
Socket.defineOption(56, "Bool", ["routerHandover", "handover"], {on: Router})
Socket.defineOption(57, "UInt32", ["tos", "typeOfService"])
Socket.defineOption(61, "String", ["connectRid", "connectRoutingId"], {on: [Router, Stream]})

if (capability.gssapi) {
  Socket.defineOption(62, "Bool", ["gssapiServer"])
  Socket.defineOption(63, "String", ["gssapiPrincipal"])
  Socket.defineOption(64, "String", ["gssapiServicePrincipal"])
  Socket.defineOption(65, "Bool", ["gssapiPlaintext", "gssapiPlainText"])
}

Socket.defineOption(66, "Int32", ["handshakeIvl", "handshakeInterval"])
Socket.defineOption(68, "String", ["socksProxy"])
Socket.defineOption(73, "Bool", ["streamNotify", "notify"], {on: Stream})
Socket.defineOption(74, "Bool", ["invertMatching"], {on: [Publisher, Subscriber, XPublisher]})
Socket.defineOption(75, "Int32", ["heartbeatIvl", "heartbeatInterval"])
Socket.defineOption(76, "Int32", ["heartbeatTtl", "heartbeatTimeToLive"])
Socket.defineOption(77, "Int32", ["heartbeatTimeout"])
Socket.defineOption(79, "Int32", ["connectTimeout"])
Socket.defineOption(80, "Int32", ["tcpMaxrt", "tcpMaxRetransmitTimeout"])
Socket.defineOption(81, "Bool", ["threadSafe"])
Socket.defineOption(84, "Int32", ["multicastMaxtpdu", "multicastMaxTransportDataUnit"])
Socket.defineOption(85, "UInt64", ["vmciBufferSize"])
Socket.defineOption(86, "UInt64", ["vmciBufferMinSize"])
Socket.defineOption(87, "UInt64", ["vmciBufferMaxSize"])
Socket.defineOption(88, "Int32", ["vmciConnectTimeout"])
Socket.defineOption(89, "Int32", ["useFd"], {read: false})

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

if (Symbol.asyncIterator) {
  /* Support async iteration over received messages. TODO: Move to C++. */
  Socket.prototype[Symbol.asyncIterator] = function() {
    return {
      next: async () => {
        return this.closed ? {done: true} : {value: await this.receive(), done: false}
      }
    }
  }
}

Object.assign(module.exports, {
  Pair,
  Publisher,
  Subscriber,
  Request,
  Response,
  Dealer,
  Router,
  Pull,
  Push,
  XPublisher,
  XSubscriber,
  Stream,
})
