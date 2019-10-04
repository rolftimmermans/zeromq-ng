/* tslint:disable: no-var-requires */

/* Declare all native C++ classes and methods in this file. */
const path = require("path")
module.exports = require("node-gyp-build")(path.join(__dirname, ".."))

export type Message = (
  ArrayBufferView |
  ArrayBuffer |
  SharedArrayBuffer |
  string |
  null
)

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


export type SocketOptions<T extends Socket> = Options<T, {context: Context}>

export declare class Socket implements Readable<Buffer[]> {
  readonly events: Observer
  readonly context: Context

  readonly closed: boolean
  readonly readable: boolean
  readonly writable: boolean

  /**
   * Creates a new ØMQ socket of the given type and sets any provided socket options.
   */
  protected constructor(type: SocketType, options?: Options<Socket, {context: Context}>)

  close(): void
  bind(address: string): Promise<void>
  unbind(address: string): Promise<void>
  connect(address: string): void
  disconnect(address: string): void

  send(message: Message | Message[]): Promise<void>
  receive(): Promise<Buffer[]>

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
  protected setStringOption(option: number, value: string | null): void
}


export declare class ErrnoError extends Error {
  code?: string
  errno?: number
}

export type Event = (
  "accept" | "accept:error" |
  "bind" | "bind:error" |
  "connect" | "connect:delay" | "connect:retry" |
  "close" | "close:error" |
  "disconnect" |
  "end" |
  "handshake" | "handshake:error:protocol" |
  "handshake:error:auth" | "handshake:error:other" |
  "unknown"
)

export interface EventDetails {
  address?: string,
  interval?: number,
  error?: ErrnoError,
}

export declare class Observer implements Readable<[Event, EventDetails]> {
  readonly closed: boolean

  protected constructor(socket: Socket)

  close(): void
  receive(): Promise<[Event, EventDetails]>
}


export declare class Proxy {
  readonly frontEnd: Socket
  readonly backEnd: Socket

  constructor(frontEnd: Socket, backEnd: Socket)

  run(): Promise<void>
  pause(): void
  resume(): void
  terminate(): void
}

export interface Readable<T> {
  readonly closed: boolean

  close(): void
  receive(): Promise<T>
}

/* Utility types. */

/* https://stackoverflow.com/questions/49579094 */
type IfEquals<X, Y, A, B = never> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? A : B

/* https://stackoverflow.com/questions/57683303 */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

export type ReadableKeys<T> = {
  /* tslint:disable-next-line: ban-types */
  [P in keyof T]-?: T[P] extends Function ? never : P
}[keyof T]

export type WritableKeys<T> = {
  /* tslint:disable-next-line: ban-types */
  [P in keyof T]-?: T[P] extends Function ?
    never : IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P>
}[keyof T]

export type Options<T, E = {}> = Expand<Partial<E & Pick<T, WritableKeys<T>>>>
