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

export interface Writable<S extends [any, ...any[]] = [MessageLike | MessageLike[]]> {
  send(...message: S): Promise<void>
}

export interface Readable<R extends any = Message[]> {
  receive(): Promise<R>
  [Symbol.asyncIterator](): AsyncIterator<R, undefined>
}


export type SocketOptions<T> = Options<T, {context: Context}>


type SocketIterable<T> = Readable<T> & {closed: boolean}

/* Support async iteration over received messages. Implementing this in JS
   is faster as long as there is no C++ native API to chain promises. */
function asyncIterator<T extends SocketIterable<U>, U>(this: T) {
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

(Socket.prototype as any)[Symbol.asyncIterator] = asyncIterator
Observer.prototype[Symbol.asyncIterator] = asyncIterator


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

    readonly type: SocketType
    readonly lastEndpoint: string | null
    readonly securityMechanism: null | "plain" | "curve" | "gssapi"
    readonly threadSafe: boolean
  }

  interface Observer extends Readable<[Event, EventDetails]> {
    readonly emitter: NodeJS.EventEmitter

    on(event: Event, callback: (details: EventDetails) => void): NodeJS.EventEmitter
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


// const RawSocket: Writable & Readable = Socket.prototype as any

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

  // send(event: SubscriptionEvent, message: NonNullable<MessageLike>): Promise<void> {
  //   const prefix = Buffer.from([event === "subscribe" ? 0x01 : 0x00])
  // tslint:disable-next-line: max-line-length
  //   return RawSocket.send.call(this, Buffer.concat([prefix, Buffer.from(message as any)]))
  // }
}

export interface XPublisher extends
  // tslint:disable-next-line: comment-format
  Readable, Writable {} //<[SubscriptionEvent, NonNullable<MessageLike>]> {}

Object.assign(XPublisher.prototype, {send, receive})


export class XSubscriber extends Socket {
  constructor(options?: SocketOptions<XSubscriber>) {
    super(SocketType.XSubscriber, options)
  }

  // async receive(): Promise<[SubscriptionEvent, Message]> {
  //   const [message] = await RawSocket.receive.call(this)
  //   const event = message[0] === 0x1 ? "subscribe" : "unsubscribe"
  //   return [event, message.slice(1)]
  // }
}

export interface XSubscriber extends
  // tslint:disable-next-line: comment-format
  Readable, Writable {} //Readable<[SubscriptionEvent, Message]>, Writable {}

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

export interface Stream extends Readable, Writable {}
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

/* Readable properties may be set as readonly. */
function defineOpt<T, K extends ReadableKeys<T>>(
  target: T,
  name: K,
  id: number,
  type: Type,
  acc: Acc.ReadOnly,
  values?: any[],
): void

/* Writable properties may be set as writeable or readable & writable. */
function defineOpt<T, K extends WritableKeys<T>>(
  target: T,
  name: K,
  id: number,
  type: Type,
  acc?: Acc.ReadWrite | Acc.WriteOnly,
  values?: any[],
): void

/* The default is to use R/w. The overloads above ensure the correct flag is
   set if the property has been defined as readonly in the interface/class. */
function defineOpt<T, K extends ReadableKeys<T>>(
  target: T,
  name: K,
  id: number,
  type: Type,
  acc: Acc = Acc.ReadWrite,
  values?: any[],
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

  Object.defineProperty(target, name, desc)
}

/* Context options. ALSO include any options in the Context interface above. */
defineOpt(Context.prototype, "ioThreads", 1, Type.Int32)
defineOpt(Context.prototype, "maxSockets", 2, Type.Int32)
defineOpt(Context.prototype, "maxSocketsLimit", 3, Type.Int32, Acc.ReadOnly)
defineOpt(Context.prototype, "threadPriority", 3, Type.Int32, Acc.WriteOnly)
defineOpt(Context.prototype, "threadSchedulingPolicy", 4, Type.Int32, Acc.WriteOnly)
defineOpt(Context.prototype, "maxMessageSize", 5, Type.Int32)
/* This option is fairly useless in JS. */
/* defineOpt(Context.prototype, "msgTSize", 6, Type.Int32) */
/* These options should be methods. */
/* defineOpt(Context.prototype, "threadAffinityCpuAdd", 7, Type.Int32) */
/* defineOpt(Context.prototype, "threadAffinityCpuRemove", 8, Type.Int32) */
/* To be released in a new ZeroMQ version. */
/* if (Context.prototype.setStringOption) {
  defineOpt(Context.prototype, "threadNamePrefix", 9, Type.String)
} */
/* There should be no reason to change this in JS. */
/* defineOpt(Context.prototype, "zeroCopyRecv", 10, Type.Bool) */

defineOpt(Context.prototype, "ipv6", 42, Type.Bool)
defineOpt(Context.prototype, "blocky", 70, Type.Bool)

/* Socket options. ALSO include any options in the Socket interface above. */
defineOpt(Socket.prototype, "affinity", 4, Type.Uint64)

for (const target of [Request, Reply, Router, Dealer]) {
  defineOpt(target.prototype, "routingId", 5, Type.String)
}

defineOpt(Socket.prototype, "rate", 8, Type.Int32)
defineOpt(Socket.prototype, "recoveryInterval", 9, Type.Int32)
defineOpt(Socket.prototype, "sendBufferSize", 11, Type.Int32)
defineOpt(Socket.prototype, "receiveBufferSize", 12, Type.Int32)
defineOpt(Socket.prototype, "type", 16, Type.Int32, Acc.ReadOnly)
defineOpt(Socket.prototype, "linger", 17, Type.Int32)
defineOpt(Socket.prototype, "reconnectInterval", 18, Type.Int32)
defineOpt(Socket.prototype, "backlog", 19, Type.Int32)
defineOpt(Socket.prototype, "reconnectMaxInterval", 21, Type.Int32)
defineOpt(Socket.prototype, "maxMessageSize", 22, Type.Int64)
defineOpt(Socket.prototype, "sendHighWaterMark", 23, Type.Int32)
defineOpt(Socket.prototype, "receiveHighWaterMark", 24, Type.Int32)
defineOpt(Socket.prototype, "multicastHops", 25, Type.Int32)
defineOpt(Socket.prototype, "receiveTimeout", 27, Type.Int32)
defineOpt(Socket.prototype, "sendTimeout", 28, Type.Int32)
defineOpt(Socket.prototype, "lastEndpoint", 32, Type.String, Acc.ReadOnly)
defineOpt(Router.prototype, "mandatory", 33, Type.Bool)
defineOpt(Socket.prototype, "tcpKeepalive", 34, Type.Int32)
defineOpt(Socket.prototype, "tcpKeepaliveCount", 35, Type.Int32)
defineOpt(Socket.prototype, "tcpKeepaliveIdle", 36, Type.Int32)
defineOpt(Socket.prototype, "tcpKeepaliveInterval", 37, Type.Int32)
defineOpt(Socket.prototype, "tcpAcceptFilter", 38, Type.String)
defineOpt(Socket.prototype, "immediate", 39, Type.Bool)
/* Option 'verbose' is implemented as verbosity on XPublisher. */
defineOpt(Socket.prototype, "ipv6", 42, Type.Bool)
defineOpt(Socket.prototype, "securityMechanism", 43, Type.Int32,
  Acc.ReadOnly, [null, "plain", "curve", "gssapi"])
defineOpt(Socket.prototype, "plainServer", 44, Type.Bool)
defineOpt(Socket.prototype, "plainUsername", 45, Type.String)
defineOpt(Socket.prototype, "plainPassword", 46, Type.String)

if (capability.curve) {
  defineOpt(Socket.prototype, "curveServer", 47, Type.Bool)
  defineOpt(Socket.prototype, "curvePublicKey", 48, Type.String)
  defineOpt(Socket.prototype, "curveSecretKey", 49, Type.String)
  defineOpt(Socket.prototype, "curveServerKey", 50, Type.String)
}

for (const target of [Router, Dealer, Request]) {
  defineOpt(target.prototype, "probeRouter", 51, Type.Bool, Acc.WriteOnly)
}

defineOpt(Request.prototype, "correlate", 52, Type.Bool, Acc.WriteOnly)
defineOpt(Request.prototype, "relaxed", 53, Type.Bool, Acc.WriteOnly)

for (const target of [
  Pull, Push, Subscriber, Publisher, Dealer,
  draft.Scatter, draft.Gather,
]) {
  defineOpt(target.prototype, "conflate", 54, Type.Bool, Acc.WriteOnly)
}

defineOpt(Socket.prototype, "zapDomain", 55, Type.String)
defineOpt(Router.prototype, "handover", 56, Type.Bool, Acc.WriteOnly)
defineOpt(Socket.prototype, "typeOfService", 57, Type.Uint32)

if (capability.gssapi) {
  defineOpt(Socket.prototype, "gssapiServer", 62, Type.Bool)
  defineOpt(Socket.prototype, "gssapiPrincipal", 63, Type.String)
  defineOpt(Socket.prototype, "gssapiServicePrincipal", 64, Type.String)
  defineOpt(Socket.prototype, "gssapiPlainText", 65, Type.Bool)
  defineOpt(Socket.prototype, "gssapiPrincipalNameType", 90, Type.Int32,
    Acc.ReadWrite, ["hostBased", "userName", "krb5Principal"])
  defineOpt(Socket.prototype, "gssapiServicePrincipalNameType", 91, Type.Int32,
    Acc.ReadWrite, ["hostBased", "userName", "krb5Principal"])
}

defineOpt(Socket.prototype, "handshakeInterval", 66, Type.Int32)
defineOpt(Socket.prototype, "socksProxy", 68, Type.String)

for (const target of [XPublisher, Publisher]) {
  defineOpt(target.prototype, "noDrop", 69, Type.Bool, Acc.WriteOnly)
}

defineOpt(XPublisher.prototype, "manual", 71, Type.Bool, Acc.WriteOnly)
defineOpt(XPublisher.prototype, "welcomeMessage", 72, Type.String, Acc.WriteOnly)
defineOpt(Stream.prototype, "notify", 73, Type.Bool, Acc.WriteOnly)

for (const target of [Publisher, Subscriber, XPublisher]) {
  defineOpt(target.prototype, "invertMatching", 74, Type.Bool)
}

defineOpt(Socket.prototype, "heartbeatInterval", 75, Type.Int32)
defineOpt(Socket.prototype, "heartbeatTimeToLive", 76, Type.Int32)
defineOpt(Socket.prototype, "heartbeatTimeout", 77, Type.Int32)
/* Option 'verboser' is implemented as verbosity on XPublisher. */
defineOpt(Socket.prototype, "connectTimeout", 79, Type.Int32)
defineOpt(Socket.prototype, "tcpMaxRetransmitTimeout", 80, Type.Int32)
defineOpt(Socket.prototype, "threadSafe", 81, Type.Bool, Acc.ReadOnly)
defineOpt(Socket.prototype, "multicastMaxTransportDataUnit", 84, Type.Int32)
defineOpt(Socket.prototype, "vmciBufferSize", 85, Type.Uint64)
defineOpt(Socket.prototype, "vmciBufferMinSize", 86, Type.Uint64)
defineOpt(Socket.prototype, "vmciBufferMaxSize", 87, Type.Uint64)
defineOpt(Socket.prototype, "vmciConnectTimeout", 88, Type.Int32)

/* Not sure if ZMQ_USE_FD option can be used with Node.js? Haven't been able
   to get it to work in any meaningful way. Feel free to suggest a test case
   and we can add it again. */
/* defineOpt(Socket.prototype, "useFd", 89, Type.Int32, Acc.Write) */
defineOpt(Socket.prototype, "interface", 92, Type.String)
defineOpt(Socket.prototype, "zapEnforceDomain", 93, Type.Bool)
defineOpt(Socket.prototype, "loopbackFastPath", 94, Type.Bool)
/* The following options are still in DRAFT. */
/* defineOpt(Socket.prototype, "metadata", 95, Type.String) */
/* defineOpt(Socket.prototype, "multicastLoop", 96, Type.String) */
/* defineOpt(Router.prototype, "notify", 97, Type.String) */
/* defineOpt(XPublisher.prototype, "manualLastValue", 98, Type.String) */
/* defineOpt(Socket.prototype, "socksUsername", 99, Type.String) */
/* defineOpt(Socket.prototype, "socksPassword", 100, Type.String) */
/* defineOpt(Socket.prototype, "inBatchSize", 101, Type.String) */
/* defineOpt(Socket.prototype, "outBatchSize", 102, Type.String) */
