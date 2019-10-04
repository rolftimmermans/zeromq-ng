export * from "./native"

import {
  capability,
  Context,
  Observer,
  Readable,
  Socket,
  SocketOptions,
  SocketType,
} from "./native"

/* Support async iteration over received messages. Implementing this in JS
   is faster as long as there is no C++ native API to chain promises. */
function asyncIterator<T extends Readable<U>, U>(this: T): AsyncIterator<U> {
  return {
    next: async (): Promise<IteratorResult<U>> => {
      if (this.closed) {
        /* Cast so we can omit 'value: undefined'. */
        return {done: true} as IteratorReturnResult<undefined>
      }

      try {
        return {value: await this.receive(), done: false}
      } catch (err) {
        if (this.closed && err.code === "EAGAIN") {
          /* Cast so we can omit 'value: undefined'. */
          return {done: true} as IteratorReturnResult<undefined>
        } else {
          throw err
        }
      }
    },
  }
}

Socket.prototype[Symbol.asyncIterator] = asyncIterator
Observer.prototype[Symbol.asyncIterator] = asyncIterator

Object.defineProperty(Observer.prototype, "emitter", {
  get: function emitter() {
    const {EventEmitter} = require("events")
    const value = new EventEmitter()

    const receive = this.receive.bind(this)
    Object.defineProperty(this, "receive", {
      get: () => {
        throw new Error(
          "Observer is in event emitter mode. " +
          "After a call to events.on() it is not possible to read events " +
          "with events.receive().",
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


/* Declare all additional TypeScript prototype methods that have been added
   in this file here. They will augment the native module exports. */
declare module "./native" {
  interface Context {
    blocky: boolean
    ioThreads: number
    maxMessageSize: number
    maxSockets: number
    ipv6: boolean
    threadPriority: number
    threadSchedulingPolicy: number

    readonly maxSocketsLimit: number
  }

  interface Socket {
    affinity: number
    rate: number
    recoveryInterval: number
    sendBufferSize: number
    receiveBufferSize: number
    linger: number
    reconnectInterval: number
    backlog: number
    reconnectMaxInterval: number
    maxMessageSize: number
    sendHighWaterMark: number
    receiveHighWaterMark: number
    multicastHops: number
    receiveTimeout: number
    sendTimeout: number
    tcpKeepalive: number
    tcpKeepaliveCount: number
    tcpKeepaliveIdle: number
    tcpKeepaliveInterval: number
    tcpAcceptFilter: string | null
    immediate: boolean
    ipv6: boolean
    plainServer: boolean
    plainUsername: string | null
    plainPassword: string | null

    curveServer: boolean
    curvePublicKey: string | null
    curveSecretKey: string | null
    curveServerKey: string | null

    gssapiServer: boolean
    gssapiPrincipal: string | null
    gssapiServicePrincipal: string | null
    gssapiPlainText: boolean
    gssapiPrincipalNameType: "hostBased" | "userName" | "krb5Principal"
    gssapiServicePrincipalNameType: "hostBased" | "userName" | "krb5Principal"

    zapDomain: string | null
    typeOfService: number
    handshakeInterval: number
    socksProxy: string | null
    heartbeatInterval: number
    heartbeatTimeToLive: number
    heartbeatTimeout: number
    connectTimeout: number
    tcpMaxRetransmitTimeout: number
    multicastMaxTransportDataUnit: number
    vmciBufferSize: number
    vmciBufferMinSize: number
    vmciBufferMaxSize: number
    vmciConnectTimeout: number
    interface: string | null
    zapEnforceDomain: boolean
    loopbackFastPath: boolean

    readonly type: number
    readonly lastEndpoint: string | null
    readonly securityMechanism: null | "plain" | "curve" | "gssapi"
    readonly threadSafe: boolean

    [Symbol.asyncIterator](): AsyncIterator<Buffer[], undefined>
  }

  interface Observer {
    readonly emitter: NodeJS.EventEmitter

    on(event: Event, callback: (details: EventDetails) => void): NodeJS.EventEmitter
    [Symbol.asyncIterator](): AsyncIterator<[Event, EventDetails]>
  }
}

/* Concrete socket types. */
export class Pair extends Socket {
  constructor(options?: SocketOptions<Pair>) {
    super(SocketType.Pair, options)
  }
}

export class Publisher extends Socket {
  noDrop: boolean
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions<Publisher>) {
    super(SocketType.Publisher, options)
  }
}

export class Subscriber extends Socket {
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions<Subscriber>) {
    super(SocketType.Subscriber, options)
  }

  subscribe(...values: string[]) {
    if (values.length === 0) {
      this.setStringOption(6, null)
    } else {
      for (const value of values) {
        this.setStringOption(6, value)
      }
    }
  }

  unsubscribe(...values: string[]) {
    if (values.length === 0) {
      this.setStringOption(7, null)
    } else {
      for (const value of values) {
        this.setStringOption(7, value)
      }
    }
  }
}

export class Request extends Socket {
  routingId: string | null
  probeRouter: boolean
  correlate: boolean
  relaxed: boolean

  constructor(options?: SocketOptions<Request>) {
    super(SocketType.Request, options)
  }
}

export class Reply extends Socket {
  routingId: string | null

  constructor(options?: SocketOptions<Reply>) {
    super(SocketType.Reply, options)
  }
}

export class Dealer extends Socket {
  routingId: string | null
  probeRouter: boolean
  conflate: boolean

  constructor(options?: SocketOptions<Dealer>) {
    super(SocketType.Dealer, options)
  }
}

export interface RouterConnectOptions {
  routingId?: string
}

export class Router extends Socket {
  routingId: string | null
  mandatory: boolean
  probeRouter: boolean
  handover: boolean

  constructor(options?: SocketOptions<Router>) {
    super(SocketType.Router, options)
  }

  connect(address: string, {routingId}: RouterConnectOptions = {}) {
    if (routingId) {
      this.setStringOption(61, routingId)
    }

    super.connect(address)
  }
}

export class Pull extends Socket {
  conflate: boolean

  constructor(options?: SocketOptions<Pull>) {
    super(SocketType.Pull, options)
  }
}

export class Push extends Socket {
  conflate: boolean

  constructor(options?: SocketOptions<Push>) {
    super(SocketType.Push, options)
  }
}

export class XPublisher extends Socket {
  verbose: boolean
  verboser: boolean
  noDrop: boolean
  manual: boolean
  welcomeMessage: string | null
  invertMatching: boolean

  constructor(options?: SocketOptions<XPublisher>) {
    super(SocketType.XPublisher, options)
  }
}

export class XSubscriber extends Socket {
  constructor(options?: SocketOptions<XSubscriber>) {
    super(SocketType.XSubscriber, options)
  }
}

export interface StreamConnectOptions {
  routingId?: string
}

export class Stream extends Socket {
  notify: boolean

  constructor(options?: SocketOptions<Stream>) {
    super(SocketType.Stream, options)
  }

  connect(address: string, {routingId}: StreamConnectOptions = {}) {
    if (routingId) {
      this.setStringOption(61, routingId)
    }

    super.connect(address)
  }
}


/* Meta function to define new socket/context options without much boilerplate. */
interface DefineOpts {
  read?: boolean
  write?: boolean
  on?: any
  values?: any[]
}

type OptType = (
  "Bool" |
  "Int32" |
  "Uint32" |
  "Int64" |
  "Uint64" |
  "String"
)

function defineOption(id: number, type: OptType, name: string, opts: DefineOpts = {}) {
  const {on = [Socket], read = true, write = true, values} = opts

  const desc: PropertyDescriptor = {}

  if (read) {
    if (values) {
      desc.get = function get(this: any) {
        return values[this[`get${type}Option`](id)]
      }
    } else {
      desc.get = function get(this: any) {
        return this[`get${type}Option`](id)
      }
    }
  }

  if (write) {
    if (values) {
      desc.set = function set(this: any, val: any) {
        this[`set${type}Option`](id, values.indexOf(val))
      }
    } else {
      desc.set = function set(this: any, val: any) {
        this[`set${type}Option`](id, val)
      }
    }
  }

  for (const target of Array.isArray(on) ? on : [on]) {
    Object.defineProperty(target.prototype, name, desc)
  }
}

/* Context options. ALSO include any options in the Context interface above. */
defineOption(1, "Int32", "ioThreads", {on: Context})
defineOption(2, "Int32", "maxSockets", {on: Context})
defineOption(3, "Int32", "maxSocketsLimit", {write: false, on: Context})
defineOption(3, "Int32", "threadPriority", {read: false, on: Context})
defineOption(4, "Int32", "threadSchedulingPolicy", {read: false, on: Context})
defineOption(5, "Int32", "maxMessageSize", {on: Context})
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

defineOption(42, "Bool", "ipv6", {on: Context})
defineOption(70, "Bool", "blocky", {on: Context})

/* Socket options. ALSO include any options in the Socket interface above. */
defineOption(4, "Uint64", "affinity")
defineOption(5, "String", "routingId", {
  on: [Request, Reply, Router, Dealer],
})
defineOption(8, "Int32", "rate")
defineOption(9, "Int32", "recoveryInterval")
defineOption(11, "Int32", "sendBufferSize")
defineOption(12, "Int32", "receiveBufferSize")
defineOption(16, "Int32", "type", {write: false})
defineOption(17, "Int32", "linger")
defineOption(18, "Int32", "reconnectInterval")
defineOption(19, "Int32", "backlog")
defineOption(21, "Int32", "reconnectMaxInterval")
defineOption(22, "Int64", "maxMessageSize")
defineOption(23, "Int32", "sendHighWaterMark")
defineOption(24, "Int32", "receiveHighWaterMark")
defineOption(25, "Int32", "multicastHops")
defineOption(27, "Int32", "receiveTimeout")
defineOption(28, "Int32", "sendTimeout")
defineOption(32, "String", "lastEndpoint", {write: false})
defineOption(33, "Bool", "mandatory", {on: Router})
defineOption(34, "Int32", "tcpKeepalive")
defineOption(35, "Int32", "tcpKeepaliveCount")
defineOption(36, "Int32", "tcpKeepaliveIdle")
defineOption(37, "Int32", "tcpKeepaliveInterval")
defineOption(38, "String", "tcpAcceptFilter")
defineOption(39, "Bool", "immediate")
defineOption(40, "Bool", "verbose", {read: false, on: XPublisher})
defineOption(42, "Bool", "ipv6")
defineOption(43, "Int32", "securityMechanism", {
  write: false,
  values: [null, "plain", "curve", "gssapi"],
})
defineOption(44, "Bool", "plainServer")
defineOption(45, "String", "plainUsername")
defineOption(46, "String", "plainPassword")

if (capability.curve) {
  defineOption(47, "Bool", "curveServer")
  defineOption(48, "String", "curvePublicKey")
  defineOption(49, "String", "curveSecretKey")
  defineOption(50, "String", "curveServerKey")
}

defineOption(51, "Bool", "probeRouter", {read: false,
  on: [Router, Dealer, Request],
})
defineOption(52, "Bool", "correlate", {read: false, on: Request})
defineOption(53, "Bool", "relaxed", {read: false, on: Request})
defineOption(54, "Bool", "conflate", {read: false,
  on: [Pull, Push, Subscriber, Publisher, Dealer],
})
defineOption(55, "String", "zapDomain")
defineOption(56, "Bool", "handover", {read: false, on: Router})
defineOption(57, "Uint32", "typeOfService")

if (capability.gssapi) {
  defineOption(62, "Bool", "gssapiServer")
  defineOption(63, "String", "gssapiPrincipal")
  defineOption(64, "String", "gssapiServicePrincipal")
  defineOption(65, "Bool", "gssapiPlainText")
  defineOption(90, "Int32", "gssapiPrincipalNameType", {
    values: ["hostBased", "userName", "krb5Principal"],
  })
  defineOption(91, "Int32", "gssapiServicePrincipalNameType", {
    values: ["hostBased", "userName", "krb5Principal"],
  })
}

defineOption(66, "Int32", "handshakeInterval")
defineOption(68, "String", "socksProxy")
defineOption(69, "Bool", "noDrop", {read: false,
  on: [XPublisher, Publisher],
})
defineOption(71, "Bool", "manual", {read: false, on: XPublisher})
defineOption(72, "String", "welcomeMessage", {read: false, on: XPublisher})
defineOption(73, "Bool", "notify", {read: false, on: Stream})
defineOption(74, "Bool", "invertMatching", {
  on: [Publisher, Subscriber, XPublisher],
})
defineOption(75, "Int32", "heartbeatInterval")
defineOption(76, "Int32", "heartbeatTimeToLive")
defineOption(77, "Int32", "heartbeatTimeout")
defineOption(78, "Bool", "verboser", {read: false, on: XPublisher})
defineOption(79, "Int32", "connectTimeout")
defineOption(80, "Int32", "tcpMaxRetransmitTimeout")
defineOption(81, "Bool", "threadSafe", {read: false})
defineOption(84, "Int32", "multicastMaxTransportDataUnit")
defineOption(85, "Uint64", "vmciBufferSize")
defineOption(86, "Uint64", "vmciBufferMinSize")
defineOption(87, "Uint64", "vmciBufferMaxSize")
defineOption(88, "Int32", "vmciConnectTimeout")

/* TODO: verbose/verboser might be better represented as one option that can
   have three states. */

/* Not sure if ZMQ_USE_FD option can be used with Node.js? Haven't been able
   to get it to work in any meaningful way. Feel free to suggest a test case
   and we can add it again. */
/* defineOption(89, "Int32", "useFd", {read: false}) */
defineOption(92, "String", "interface")
defineOption(93, "Bool", "zapEnforceDomain")
defineOption(94, "Bool", "loopbackFastPath")
/* The following options are still in DRAFT. */
/* defineOption(95, "String", "metadata") */
/* defineOption(96, "String", "multicastLoop") */
/* defineOption(97, "String", "notify", {on: Router}) */
/* defineOption(98, "String", "manualLastValue", {on: XPublisher}) */
/* defineOption(99, "String", "socksUsername") */
/* defineOption(100, "String", "socksPassword") */
/* defineOption(101, "String", "inBatchSize") */
/* defineOption(102, "String", "outBatchSize") */
