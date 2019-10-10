export {
  capability,
  curveKeyPair,
  version,
  global,
  Context,
  Event,
  EventDetails,
  Socket,
  SocketType,
  Observer,
  Proxy,
} from "./native"

import {
  capability,
  methods,
  Context,
  Observer,
  Options,
  ReadableKeys,
  Socket,
  SocketType,
  WritableKeys,
} from "./native"

import * as draft from "./draft"


const {send, receive} = methods

export type Message = (
  Buffer
)

export type MessageLike = (
  ArrayBufferView | /* Includes Node.js Buffer and all TypedArray types. */
  ArrayBuffer | /* Backing buffer of TypedArrays. */
  SharedArrayBuffer |
  string |
  null
)

export interface Writable<
  S extends any | any[] = MessageLike | MessageLike[],
  O extends [...any[]] = [],
> {
  multicastHops: number
  sendBufferSize: number
  sendHighWaterMark: number
  sendTimeout: number

  send(message: S, ...options: O): Promise<void>
}

type ReceiveType<T> = T extends {receive(): Promise<infer U>} ? U : never

export interface Readable<R extends any = Message[]> {
  receiveBufferSize: number
  receiveHighWaterMark: number
  receiveTimeout: number

  receive(): Promise<R>
  [Symbol.asyncIterator](): AsyncIterator<ReceiveType<this>, undefined>
}


export type SocketOptions<T> = Options<T, {context: Context}>


interface SocketLikeIterable<T> {
  closed: boolean
  receive(): Promise<T>
}

/* Support async iteration over received messages. Implementing this in JS
   is faster as long as there is no C++ native API to chain promises. */
function asyncIterator<T extends SocketLikeIterable<U>, U>(this: T) {
  return {
    next: async (): Promise<IteratorResult<U, undefined>> => {
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

(Socket.prototype as any)[Symbol.asyncIterator] = asyncIterator;
(Observer.prototype as any)[Symbol.asyncIterator] = asyncIterator


Object.defineProperty(Observer.prototype, "emitter", {
  get: function emitter(this: Observer) {
    const {EventEmitter} = require("events")
    const value: NodeJS.EventEmitter = new EventEmitter()

    const boundReceive = this.receive.bind(this)
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
        const [event, data] = await boundReceive()
        value.emit(event, data)
      }
    }

    run()

    Object.defineProperty(this, "emitter", {value})
    return value
  },
})

Observer.prototype.on = function on(this: {emitter: NodeJS.EventEmitter}, ...args) {
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
    linger: number
    reconnectInterval: number
    backlog: number
    reconnectMaxInterval: number
    maxMessageSize: number
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

    readonly type: SocketType
    readonly lastEndpoint: string | null
    readonly securityMechanism: null | "plain" | "curve" | "gssapi"
    readonly threadSafe: boolean
  }

  interface Observer {
    on(event: Event, callback: (details: EventDetails) => void): NodeJS.EventEmitter
    [Symbol.asyncIterator](): AsyncIterator<ReceiveType<this>, undefined>
  }
}

/* Concrete socket types. */
export class Pair extends Socket {
  constructor(options?: SocketOptions<Pair>) {
    super(SocketType.Pair, options)
  }
}

export interface Pair extends Writable, Readable {}
Object.assign(Pair.prototype, {send, receive})


export class Publisher extends Socket {
  noDrop: boolean
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions<Publisher>) {
    super(SocketType.Publisher, options)
  }
}

export interface Publisher extends Writable {}
Object.assign(Publisher.prototype, {send})


export class Subscriber extends Socket {
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions<Subscriber>) {
    super(SocketType.Subscriber, options)
  }

  subscribe(...values: Array<Buffer | string>) {
    if (values.length === 0) {
      this.setStringOption(6, null)
    } else {
      for (const value of values) {
        this.setStringOption(6, value)
      }
    }
  }

  unsubscribe(...values: Array<Buffer | string>) {
    if (values.length === 0) {
      this.setStringOption(7, null)
    } else {
      for (const value of values) {
        this.setStringOption(7, value)
      }
    }
  }
}

export interface Subscriber extends Readable {}
Object.assign(Subscriber.prototype, {receive})


export class Request extends Socket {
  routingId: string | null
  probeRouter: boolean
  correlate: boolean
  relaxed: boolean

  constructor(options?: SocketOptions<Request>) {
    super(SocketType.Request, options)
  }
}

export interface Request extends Readable, Writable {}
Object.assign(Request.prototype, {send, receive})


export class Reply extends Socket {
  routingId: string | null

  constructor(options?: SocketOptions<Reply>) {
    super(SocketType.Reply, options)
  }
}

export interface Reply extends Readable, Writable {}
Object.assign(Reply.prototype, {send, receive})


export class Dealer extends Socket {
  routingId: string | null
  probeRouter: boolean
  conflate: boolean

  constructor(options?: SocketOptions<Dealer>) {
    super(SocketType.Dealer, options)
  }
}

export interface Dealer extends Readable, Writable {}
Object.assign(Dealer.prototype, {send, receive})


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

export interface Router extends Readable, Writable {}
Object.assign(Router.prototype, {send, receive})


export class Pull extends Socket {
  constructor(options?: SocketOptions<Pull>) {
    super(SocketType.Pull, options)
  }
}

export interface Pull extends Readable {
  conflate: boolean
}

Object.assign(Pull.prototype, {receive})


export class Push extends Socket {
  constructor(options?: SocketOptions<Push>) {
    super(SocketType.Push, options)
  }
}

export interface Push extends Writable {
  conflate: boolean
}

Object.assign(Push.prototype, {send})


export type SubscriptionEvent = "subscribe" | "unsubscribe"

export class XPublisher extends Socket {
  noDrop: boolean
  manual: boolean
  welcomeMessage: string | null
  invertMatching: boolean

  set verbosity(value: null | "allSubs" | "allSubsUnsubs") {
    /* ZMQ_XPUB_VERBOSE and ZMQ_XPUB_VERBOSER interact, so we normalize the
       situation by making it a single property. */
    switch (value) {
      case null:
        /* This disables ZMQ_XPUB_VERBOSE + ZMQ_XPUB_VERBOSER: */
        this.setBoolOption(40 /* ZMQ_XPUB_VERBOSE */, false); break
      case "allSubs":
        this.setBoolOption(40 /* ZMQ_XPUB_VERBOSE */, true); break
      case "allSubsUnsubs":
        this.setBoolOption(78 /* ZMQ_XPUB_VERBOSER */, true); break
    }
  }

  constructor(options?: SocketOptions<XPublisher>) {
    super(SocketType.XPublisher, options)
  }
}

export interface XPublisher extends Readable, Writable {}
Object.assign(XPublisher.prototype, {send, receive})


export class XSubscriber extends Socket {
  constructor(options?: SocketOptions<XSubscriber>) {
    super(SocketType.XSubscriber, options)
  }
}

export interface XSubscriber extends Readable, Writable {}
Object.assign(XSubscriber.prototype, {send, receive})


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

export interface Stream extends
  Readable<[Message, Message]>, Writable<[MessageLike, MessageLike]> {}
Object.assign(Stream.prototype, {send, receive})


/* Meta functionality to define new socket/context options. */
const enum Type {
  Bool = "Bool",
  Int32 = "Int32",
  Uint32 = "Uint32",
  Int64 = "Int64",
  Uint64 = "Uint64",
  String = "String",
}

/* Defines the accessibility of options. */
const enum Acc {
  Read = 1,
  ReadOnly = 1,

  Write = 2,
  WriteOnly = 2,

  ReadWrite = 3,
}

/* tslint:disable-next-line: ban-types */
type PrototypeOf<T> = T extends Function & {prototype: infer U} ? U : never

/* Readable properties may be set as readonly. */
function defineOpt<T, K extends ReadableKeys<PrototypeOf<T>>>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc: Acc.ReadOnly,
  values?: Array<string | null>,
): void

/* Writable properties may be set as writeable or readable & writable. */
function defineOpt<T, K extends WritableKeys<PrototypeOf<T>>>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc?: Acc.ReadWrite | Acc.WriteOnly,
  values?: Array<string | null>,
): void

/* The default is to use R/w. The overloads above ensure the correct flag is
   set if the property has been defined as readonly in the interface/class. */
function defineOpt<T extends {prototype: any}, K extends ReadableKeys<PrototypeOf<T>>>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc: Acc = Acc.ReadWrite,
  values?: Array<string | null>,
): void {
  const desc: PropertyDescriptor = {}

  if (acc & Acc.Read) {
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

  if (acc & Acc.Write) {
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

  for (const target of targets) {
    Object.defineProperty(target.prototype, name, desc)
  }
}

/* Context options. ALSO include any options in the Context interface above. */
defineOpt([Context], "ioThreads", 1, Type.Int32)
defineOpt([Context], "maxSockets", 2, Type.Int32)
defineOpt([Context], "maxSocketsLimit", 3, Type.Int32, Acc.ReadOnly)
defineOpt([Context], "threadPriority", 3, Type.Int32, Acc.WriteOnly)
defineOpt([Context], "threadSchedulingPolicy", 4, Type.Int32, Acc.WriteOnly)
defineOpt([Context], "maxMessageSize", 5, Type.Int32)
defineOpt([Context], "ipv6", 42, Type.Bool)
defineOpt([Context], "blocky", 70, Type.Bool)
/* Option 'msgTSize' is fairly useless in Node.js. */
/* These options should be methods. */
/* defineOpt([Context], "threadAffinityCpuAdd", 7, Type.Int32) */
/* defineOpt([Context], "threadAffinityCpuRemove", 8, Type.Int32) */
/* To be released in a new ZeroMQ version. */
/* if (Context.prototype.setStringOption) {
  defineOpt([Context], "threadNamePrefix", 9, Type.String)
} */
/* There should be no reason to change this in JS. */
/* defineOpt([Context], "zeroCopyRecv", 10, Type.Bool) */

/* Socket options. ALSO include any options in the Socket interface above. */
const writables = [
  Pair, Publisher, Request, Reply, Dealer, Router, Push, XPublisher, XSubscriber, Stream,
  draft.Server, draft.Client, draft.Radio, draft.Scatter, draft.Datagram,
]

defineOpt(writables, "sendBufferSize", 11, Type.Int32)
defineOpt(writables, "sendHighWaterMark", 23, Type.Int32)
defineOpt(writables, "sendTimeout", 28, Type.Int32)
defineOpt(writables, "multicastHops", 25, Type.Int32)

const readables = [
  Pair, Subscriber, Request, Reply, Dealer, Router, Pull, XPublisher, XSubscriber, Stream,
  draft.Server, draft.Client, draft.Dish, draft.Gather, draft.Datagram,
]

defineOpt(readables, "receiveBufferSize", 12, Type.Int32)
defineOpt(readables, "receiveHighWaterMark", 24, Type.Int32)
defineOpt(readables, "receiveTimeout", 27, Type.Int32)

defineOpt([Socket], "affinity", 4, Type.Uint64)
defineOpt([Request, Reply, Router, Dealer], "routingId", 5, Type.String)
defineOpt([Socket], "rate", 8, Type.Int32)
defineOpt([Socket], "recoveryInterval", 9, Type.Int32)
defineOpt([Socket], "type", 16, Type.Int32, Acc.ReadOnly)
defineOpt([Socket], "linger", 17, Type.Int32)
defineOpt([Socket], "reconnectInterval", 18, Type.Int32)
defineOpt([Socket], "backlog", 19, Type.Int32)
defineOpt([Socket], "reconnectMaxInterval", 21, Type.Int32)
defineOpt([Socket], "maxMessageSize", 22, Type.Int64)
defineOpt([Socket], "lastEndpoint", 32, Type.String, Acc.ReadOnly)
defineOpt([Router], "mandatory", 33, Type.Bool)
defineOpt([Socket], "tcpKeepalive", 34, Type.Int32)
defineOpt([Socket], "tcpKeepaliveCount", 35, Type.Int32)
defineOpt([Socket], "tcpKeepaliveIdle", 36, Type.Int32)
defineOpt([Socket], "tcpKeepaliveInterval", 37, Type.Int32)
defineOpt([Socket], "tcpAcceptFilter", 38, Type.String)
defineOpt([Socket], "immediate", 39, Type.Bool)
/* Option 'verbose' is implemented as verbosity on XPublisher. */
defineOpt([Socket], "ipv6", 42, Type.Bool)
defineOpt([Socket], "securityMechanism", 43, Type.Int32,
  Acc.ReadOnly, [null, "plain", "curve", "gssapi"])
defineOpt([Socket], "plainServer", 44, Type.Bool)
defineOpt([Socket], "plainUsername", 45, Type.String)
defineOpt([Socket], "plainPassword", 46, Type.String)

if (capability.curve) {
  defineOpt([Socket], "curveServer", 47, Type.Bool)
  defineOpt([Socket], "curvePublicKey", 48, Type.String)
  defineOpt([Socket], "curveSecretKey", 49, Type.String)
  defineOpt([Socket], "curveServerKey", 50, Type.String)
}

defineOpt([Router, Dealer, Request], "probeRouter", 51, Type.Bool, Acc.WriteOnly)
defineOpt([Request], "correlate", 52, Type.Bool, Acc.WriteOnly)
defineOpt([Request], "relaxed", 53, Type.Bool, Acc.WriteOnly)

defineOpt([Pull, Push, Subscriber, Publisher, Dealer, draft.Scatter, draft.Gather],
  "conflate", 54, Type.Bool, Acc.WriteOnly)

defineOpt([Socket], "zapDomain", 55, Type.String)
defineOpt([Router], "handover", 56, Type.Bool, Acc.WriteOnly)
defineOpt([Socket], "typeOfService", 57, Type.Uint32)

if (capability.gssapi) {
  defineOpt([Socket], "gssapiServer", 62, Type.Bool)
  defineOpt([Socket], "gssapiPrincipal", 63, Type.String)
  defineOpt([Socket], "gssapiServicePrincipal", 64, Type.String)
  defineOpt([Socket], "gssapiPlainText", 65, Type.Bool)
  defineOpt([Socket], "gssapiPrincipalNameType", 90, Type.Int32,
    Acc.ReadWrite, ["hostBased", "userName", "krb5Principal"])
  defineOpt([Socket], "gssapiServicePrincipalNameType", 91, Type.Int32,
    Acc.ReadWrite, ["hostBased", "userName", "krb5Principal"])
}

defineOpt([Socket], "handshakeInterval", 66, Type.Int32)
defineOpt([Socket], "socksProxy", 68, Type.String)
defineOpt([XPublisher, Publisher], "noDrop", 69, Type.Bool, Acc.WriteOnly)
defineOpt([XPublisher], "manual", 71, Type.Bool, Acc.WriteOnly)
defineOpt([XPublisher], "welcomeMessage", 72, Type.String, Acc.WriteOnly)
defineOpt([Stream], "notify", 73, Type.Bool, Acc.WriteOnly)
defineOpt([Publisher, Subscriber, XPublisher], "invertMatching", 74, Type.Bool)
defineOpt([Socket], "heartbeatInterval", 75, Type.Int32)
defineOpt([Socket], "heartbeatTimeToLive", 76, Type.Int32)
defineOpt([Socket], "heartbeatTimeout", 77, Type.Int32)
/* Option 'verboser' is implemented as verbosity on XPublisher. */
defineOpt([Socket], "connectTimeout", 79, Type.Int32)
defineOpt([Socket], "tcpMaxRetransmitTimeout", 80, Type.Int32)
defineOpt([Socket], "threadSafe", 81, Type.Bool, Acc.ReadOnly)
defineOpt([Socket], "multicastMaxTransportDataUnit", 84, Type.Int32)
defineOpt([Socket], "vmciBufferSize", 85, Type.Uint64)
defineOpt([Socket], "vmciBufferMinSize", 86, Type.Uint64)
defineOpt([Socket], "vmciBufferMaxSize", 87, Type.Uint64)
defineOpt([Socket], "vmciConnectTimeout", 88, Type.Int32)
/* Option 'useFd' is fairly useless in Node.js. */
defineOpt([Socket], "interface", 92, Type.String)
defineOpt([Socket], "zapEnforceDomain", 93, Type.Bool)
defineOpt([Socket], "loopbackFastPath", 94, Type.Bool)

/* The following options are still in DRAFT. */
/* defineOpt([Socket], "metadata", 95, Type.String) */
/* defineOpt([Socket], "multicastLoop", 96, Type.String) */
/* defineOpt([Router], "notify", 97, Type.String) */
/* defineOpt([XPublisher], "manualLastValue", 98, Type.String) */
/* defineOpt([Socket], "socksUsername", 99, Type.String) */
/* defineOpt([Socket], "socksPassword", 100, Type.String) */
/* defineOpt([Socket], "inBatchSize", 101, Type.String) */
/* defineOpt([Socket], "outBatchSize", 102, Type.String) */
