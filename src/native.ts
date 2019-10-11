/* tslint:disable: no-var-requires ban-types */

/* Declare all native C++ classes and methods in this file. */
const path = require("path")
module.exports = require("node-gyp-build")(path.join(__dirname, ".."))


/* We are removing public methods from the Socket prototype that do not apply
   to all socket types. We will re-assign them to the prototypes of the
   relevant sockets later. For send/receive it is important that they are not
   wrapped in JS methods later, to ensure best performance. Any changes to
   their signatures should be handled in C++ exclusively. */
const sack: any = {}
const target = module.exports.Socket.prototype
for (const key of ["send", "receive", "join", "leave"]) {
  sack[key] = target[key]
  delete target[key]
}

module.exports.methods = sack


export declare const methods: {
  send: Function,
  receive: Function,
  join: Function,
  leave: Function,
}


export declare const version: string


export declare const capability: Partial<{
  ipc: boolean,
  pgm: boolean,
  tipc: boolean,
  norm: boolean,
  curve: boolean,
  gssapi: boolean,
  draft: boolean,
}>


interface CurveKeyPair {
  publicKey: string,
  secretKey: string,
}

export declare function curveKeyPair(): CurveKeyPair


export declare class Context {
  /**
   * Creates a new ØMQ context and sets any provided context options.
   *
   * It is usually not necessary to instantiate a new context – the global
   * context is used for new sockets by default.
   */
  constructor(options?: Options<Context>)

  protected getBoolOption(option: number): boolean
  protected setBoolOption(option: number, value: boolean): void

  protected getInt32Option(option: number): number
  protected setInt32Option(option: number, value: number): void
}

export declare const global: Context


interface ErrnoError extends Error {
  code: string
  errno: number
}

interface EventAddress {
  address: string
}

interface EventInterval {
  interval: number
}

interface EventError {
  error: ErrnoError
}

type EventFor<S extends string, D = {}> = Expand<{type: S} & D>

export type Event = (
  EventFor<"accept", EventAddress> |
  EventFor<"accept:error", EventAddress & EventError> |
  EventFor<"bind", EventAddress> |
  EventFor<"bind:error", EventAddress & EventError> |
  EventFor<"connect", EventAddress> |
  EventFor<"connect:delay", EventAddress> |
  EventFor<"connect:retry", EventAddress & EventInterval> |
  EventFor<"close", EventAddress> |
  EventFor<"close:error", EventAddress & EventError> |
  EventFor<"disconnect", EventAddress> |
  EventFor<"end"> |
  EventFor<"handshake", EventAddress> |
  EventFor<"handshake:error:protocol", EventAddress> | /* TODO add error data */
  EventFor<"handshake:error:auth", EventAddress> | /* TODO add error data */
  EventFor<"handshake:error:other", EventAddress & EventError> |
  EventFor<"unknown">
)

export type EventType = Event["type"]

export type EventOfType<E extends EventType = EventType> =
  Expand<Extract<Event, Event & EventFor<E>>>

export declare class Observer {
  readonly closed: boolean

  constructor(socket: Socket)

  close(): void
  receive(): Promise<Event>
}


export declare class Proxy<
  F extends Socket = Socket,
  B extends Socket = Socket,
> {
  readonly frontEnd: F
  readonly backEnd: B

  constructor(frontEnd: F, backEnd: B)

  run(): Promise<void>
  pause(): void
  resume(): void
  terminate(): void
}


export declare abstract class Socket {
  readonly events: Observer
  readonly context: Context

  readonly closed: boolean
  readonly readable: boolean
  readonly writable: boolean

  protected constructor(type: SocketType, options?: {})

  close(): void
  bind(address: string): Promise<void>
  unbind(address: string): Promise<void>
  connect(address: string): void
  disconnect(address: string): void

  protected getBoolOption(option: number): boolean
  protected setBoolOption(option: number, value: boolean): void

  protected getInt32Option(option: number): number
  protected setInt32Option(option: number, value: number): void

  protected getUint32Option(option: number): number
  protected setUint32Option(option: number, value: number): void

  protected getInt64Option(option: number): number
  protected setInt64Option(option: number, value: number): void

  protected getUint64Option(option: number): number
  protected setUint64Option(option: number, value: number): void

  protected getStringOption(option: number): string | null
  protected setStringOption(option: number, value: string | Buffer | null): void
}


export const enum SocketType {
  Pair = 0,
  Publisher = 1,
  Subscriber = 2,
  Request = 3,
  Reply = 4,
  Dealer = 5,
  Router = 6,
  Pull = 7,
  Push = 8,
  XPublisher = 9,
  XSubscriber = 10,
  Stream = 11,

  /* DRAFT socket types. */
  Server = 12,
  Client = 13,
  Radio = 14,
  Dish = 15,
  Gather = 16,
  Scatter = 17,
  Datagram = 18,
}


/* Utility types. */

/* https://stackoverflow.com/questions/49579094 */
type IfEquals<X, Y, A, B = never> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? A : B

/* https://stackoverflow.com/questions/57683303 */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

/** @internal */
export type ReadableKeys<T> = {
  /* tslint:disable-next-line: ban-types */
  [P in keyof T]-?: T[P] extends Function ? never : P
}[keyof T]

/** @internal */
export type WritableKeys<T> = {
  /* tslint:disable-next-line: ban-types */
  [P in keyof T]-?: T[P] extends Function ?
    never : IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P>
}[keyof T]

export type Options<T, E = {}> = Expand<Partial<E & Pick<T, WritableKeys<T>>>>
