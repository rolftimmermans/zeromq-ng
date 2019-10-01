/// <reference types="node" />

import {EventEmitter} from "events"

export as namespace zmq

export const version: string

export const capability: Partial<{
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

export function curveKeyPair(): CurveKeyPair

export type Message = ArrayBufferView | ArrayBuffer | SharedArrayBuffer | string | null

interface ContextOptions {
  blocky: boolean,
  ioThreads: number,
  maxMessageSize: number,
  maxSockets: number,
  ipv6: boolean,
  threadPriority: number,
  threadSchedulingPolicy: number,
}

interface Context extends ContextOptions {
  readonly maxSocketsLimit: number
}

export class Context {
  constructor(options?: Partial<ContextOptions>)
}


interface SocketOptions {
  context: Context,

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
}

interface Socket extends SocketOptions {
  readonly type: number
  readonly lastEndpoint: string | null
  readonly securityMechanism: null | "plain" | "curve" | "gssapi"
  readonly threadSafe: boolean

  readonly events: Observer
  readonly context: Context

  readonly closed: boolean
  readonly readable: boolean
  readonly writable: boolean

  close(): void
  bind(address: string): Promise<void>
  unbind(address: string): Promise<void>
  connect(address: string): void
  disconnect(address: string): void

  send(message: Message | Message[]): Promise<void>
  receive(): Promise<Buffer[]>
  [Symbol.asyncIterator](): AsyncIterator<Buffer[]>
}

export class Socket {
  constructor(type: number, options?: Partial<SocketOptions>)
}

export class Pair extends Socket {
  constructor(options?: Partial<SocketOptions>)
}

interface PublisherOptions {
  noDrop: boolean
  conflate: boolean
  invertMatching: boolean
}

interface Publisher extends Socket, PublisherOptions {}

export class Publisher {
  constructor(options?: Partial<SocketOptions> & Partial<PublisherOptions>)
}

interface SubscriberOptions {
  conflate: boolean
  invertMatching: boolean
}

interface Subscriber extends Socket, SubscriberOptions {
  subscribe(...topics: string[]): void
  unsubscribe(...topics: string[]): void
}

export class Subscriber {
  constructor(options?: Partial<SocketOptions> & Partial<SubscriberOptions>)
}

interface RequestOptions {
  routingId: string | null
  probeRouter: boolean
  correlate: boolean
  relaxed: boolean
}

interface Request extends Socket, RequestOptions {}

export class Request {
  constructor(options?: Partial<SocketOptions> & Partial<RequestOptions>)
}

interface ReplyOptions {
  routingId: string | null
}

interface Reply extends Socket, ReplyOptions {}

export class Reply {
  constructor(options?: Partial<SocketOptions> & Partial<ReplyOptions>)
}

interface DealerOptions {
  routingId: string | null
  probeRouter: boolean
  conflate: boolean
}

interface Dealer extends Socket, DealerOptions {}

export class Dealer {
  constructor(options?: Partial<SocketOptions> & Partial<DealerOptions>)
}

interface RouterOptions {
  routingId: string | null
  mandatory: boolean
  probeRouter: boolean
  handover: boolean
}

interface RouterConnectOptions {
  routingId: string
}

interface Router extends Socket, RouterOptions {
  connect(address: string, options?: Partial<RouterConnectOptions>): void
}

export class Router {
  constructor(options?: Partial<SocketOptions> & Partial<RouterOptions>)
}

interface PullOptions {
  conflate: boolean
}

interface Pull extends Socket, PullOptions {}

export class Pull {
  constructor(options?: Partial<SocketOptions> & Partial<PullOptions>)
}

interface PushOptions {
  conflate: boolean
}

interface Push extends Socket, PushOptions {}

export class Push {
  constructor(options?: Partial<SocketOptions> & Partial<PushOptions>)
}

interface XPublisherOptions {
  verbose: boolean
  verboser: boolean
  noDrop: boolean
  manual: boolean
  welcomeMessage: string | null
  invertMatching: boolean
}

interface XPublisher extends Socket, XPublisherOptions {}

export class XPublisher {
  constructor(options?: Partial<SocketOptions> & Partial<XPublisherOptions>)
}

interface XSubscriberOptions {}

interface XSubscriber extends Socket, XSubscriberOptions {}

export class XSubscriber {
  constructor(options?: Partial<SocketOptions> & Partial<XSubscriberOptions>)
}

interface StreamOptions {
  notify: boolean
}

interface StreamConnectOptions {
  routingId: string
}

interface Stream extends Socket, StreamOptions {
  connect(address: string, options?: Partial<StreamConnectOptions>): void
}

export class Stream {
  constructor(options?: Partial<SocketOptions> & Partial<StreamOptions>)
}


type Event = (
  "accept" | "accept:error" |
  "bind" | "bind:error" |
  "connect" | "connect:delay" | "connect:retry" |
  "close" | "close:error" |
  "disconnect" |
  "end" |
  "handshake" | "handshake:error:protocol" | "handshake:error:auth" | "handshake:error:other" |
  "unknown"
)

export class ErrnoError extends Error {
  code?: string
  errno?: number
}

interface EventDetails {
  address?: string,
  interval?: number,
  error?: ErrnoError,
}

export class Observer {
  readonly closed: boolean

  constructor(socket: Socket)

  close(): void

  on(event: Event, callback: (details: EventDetails) => void): EventEmitter
  receive(): Promise<[Event, EventDetails]>
  [Symbol.asyncIterator](): AsyncIterator<[Event, EventDetails]>
}


export class Proxy {
  readonly frontEnd: Socket
  readonly backEnd: Socket

  constructor(frontEnd: Socket, backEnd: Socket)

  run(): Promise<void>
  pause(): void
  resume(): void
  terminate(): void
}


export const global: Context
