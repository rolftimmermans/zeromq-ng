/// <reference types="node" />

import {EventEmitter} from "events"

export as namespace zmq

export const version: string

export const capability: {
  ipc?: boolean,
  pgm?: boolean,
  tipc?: boolean,
  norm?: boolean,
  curve?: boolean,
  gssapi?: boolean,
  draft?: boolean,
}


interface CurveKeyPair {
  publicKey: string,
  secretKey: string,
}

export function curveKeyPair(): CurveKeyPair


export type Message = TypedArray | ArrayBuffer | string | null

interface ContextOptions {
  blocky?: boolean,
  ioThreads?: number,
  maxMessageSize?: number,
  maxSockets?: number,
  ipv6?: boolean,
  threadPriority?: number,
  threadSchedulingPolicy?: number,
}

export class Context {
  blocky: boolean
  ioThreads: number
  maxMessageSize: number
  maxSockets: number
  readonly maxSocketsLimit: number
  ipv6: boolean
  threadPriority: number
  threadSchedulingPolicy: number

  constructor(options?: ContextOptions)
}


interface SocketOptions {
  context?: Context,

  affinity?: number
  rate?: number
  recoveryInterval?: number
  sendBufferSize?: number
  receiveBufferSize?: number
  linger?: number
  reconnectInterval?: number
  backlog?: number
  reconnectMaxInterval?: number
  maxMessageSize?: number
  sendHighWaterMark?: number
  receiveHighWaterMark?: number
  multicastHops?: number
  rcvtimeo?: number
  receiveTimeout?: number
  sndtimeo?: number
  sendTimeout?: number
  lastEndpoint?: string
  tcpKeepalive?: number
  tcpKeepaliveCount?: number
  tcpKeepaliveIdle?: number
  tcpKeepaliveInterval?: number
  tcpAcceptFilter?: string
  immediate?: boolean
  ipv6?: boolean
  plainServer?: boolean
  plainUsername?: string
  plainPassword?: string

  curveServer?: boolean
  curvePublicKey?: string
  curveSecretKey?: string
  curveServerKey?: string

  gssapiServer?: boolean
  gssapiPrincipal?: string
  gssapiServicePrincipal?: string
  gssapiPlainText?: boolean
  gssapiPrincipalNameType?: "hostBased" | "userName" | "krb5Principal"
  gssapiServicePrincipalNameType?: "hostBased" | "userName" | "krb5Principal"

  zapDomain?: string
  typeOfService?: number
  handshakeInterval?: number
  socksProxy?: string
  heartbeatInterval?: number
  heartbeatTimeToLive?: number
  heartbeatTimeout?: number
  connectTimeout?: number
  tcpMaxRetransmitTimeout?: number
  multicastMaxTransportDataUnit?: number
  vmciBufferSize?: number
  vmciBufferMinSize?: number
  vmciBufferMaxSize?: number
  vmciConnectTimeout?: number
  useFd?: number
  interface?: string
}

export class Socket {
  affinity: number
  rate: number
  recoveryInterval: number
  sendBufferSize: number
  receiveBufferSize: number
  readonly type: number
  linger: number
  reconnectInterval: number
  backlog: number
  reconnectMaxInterval: number
  maxMessageSize: number
  sendHighWaterMark: number
  receiveHighWaterMark: number
  multicastHops: number
  rcvtimeo: number
  receiveTimeout: number
  sndtimeo: number
  sendTimeout: number
  lastEndpoint?: string
  tcpKeepalive: number
  tcpKeepaliveCount: number
  tcpKeepaliveIdle: number
  tcpKeepaliveInterval: number
  immediate: boolean
  ipv6: boolean
  readonly securityMechanism: null | "plain" | "curve" | "gssapi"
  plainServer: boolean
  plainUsername?: string
  plainPassword?: string

  curveServer?: boolean
  curvePublicKey?: string
  curveSecretKey?: string
  curveServerKey?: string

  gssapiServer?: boolean
  gssapiPrincipal?: string
  gssapiServicePrincipal?: string
  gssapiPlainText?: boolean
  gssapiPrincipalNameType?: "hostBased" | "userName" | "krb5Principal"
  gssapiServicePrincipalNameType?: "hostBased" | "userName" | "krb5Principal"

  zapDomain?: string
  typeOfService: number
  handshakeInterval: number
  socksProxy?: string
  heartbeatInterval: number
  heartbeatTimeToLive: number
  heartbeatTimeout: number
  connectTimeout: number
  tcpMaxRetransmitTimeout: number
  readonly threadSafe: boolean
  multicastMaxTransportDataUnit: number
  vmciBufferSize: number
  vmciBufferMinSize: number
  vmciBufferMaxSize: number
  vmciConnectTimeout: number
  useFd: number
  interface?: string

  readonly events: Observer
  readonly context: Context

  readonly closed: boolean
  readonly readable: boolean
  readonly writable: boolean

  constructor(type: number, options?: SocketOptions)

  close(): void
  bind(address: string): Promise<void>
  unbind(address: string): Promise<void>
  connect(address: string): void
  disconnect(address: string): void

  send(message: Message | Message[]): Promise<void>
  receive(): Promise<Buffer[]>
  [Symbol.asyncIterator](): AsyncIterator<Buffer[]>
}

export class Pair extends Socket {
  constructor(options?: SocketOptions)
}

interface PublisherOptions {
  noDrop?: boolean
  conflate?: boolean
  invertMatching?: boolean
}

export class Publisher extends Socket {
  noDrop: boolean
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions & PublisherOptions)
}

interface SubscriberOptions {
  conflate?: boolean
  invertMatching?: boolean
}

export class Subscriber extends Socket {
  conflate: boolean
  invertMatching: boolean

  constructor(options?: SocketOptions & SubscriberOptions)

  subscribe(...topics: string[]): void
  unsubscribe(...topics: string[]): void
}

interface RequestOptions {
  routingId?: string
  probeRouter?: boolean
  correlate?: boolean
  relaxed?: boolean
}

export class Request extends Socket {
  routingId?: string
  probeRouter: boolean
  correlate: boolean
  relaxed: boolean

  constructor(options?: SocketOptions & RequestOptions)
}

interface ReplyOptions {
  routingId?: string
}

export class Reply extends Socket {
  routingId?: string

  constructor(options?: SocketOptions & ReplyOptions)
}

interface DealerOptions {
  routingId?: string
  probeRouter?: boolean
  conflate?: boolean
}

export class Dealer extends Socket {
  routingId?: string
  probeRouter: boolean
  conflate: boolean

  constructor(options?: SocketOptions & DealerOptions)
}

interface RouterOptions {
  routingId?: string
  mandatory?: boolean
  probeRouter?: boolean
  handover?: boolean
}

interface RouterConnectOptions {
  routingId?: string
}

export class Router extends Socket {
  routingId?: string
  mandatory: boolean
  probeRouter: boolean
  handover: boolean

  constructor(options?: SocketOptions & RouterOptions)
  connect(address: string, options?: RouterConnectOptions): void
}

interface PullOptions {
  conflate?: boolean
}

export class Pull extends Socket {
  conflate: boolean

  constructor(options?: SocketOptions & PullOptions)
}

interface PushOptions {
  conflate?: boolean
}

export class Push extends Socket {
  conflate: boolean

  constructor(options?: SocketOptions & PushOptions)
}

interface XPublisherOptions {
  verbose?: boolean
  verboser?: boolean
  noDrop?: boolean
  manual?: boolean
  welcomeMessage?: string
  invertMatching?: boolean
}

export class XPublisher extends Socket {
  verbose: boolean
  verboser: boolean
  noDrop: boolean
  manual: boolean
  welcomeMessage?: string
  invertMatching: boolean

  constructor(options?: SocketOptions & XPublisherOptions)
}

interface XSubscriberOptions {
}

export class XSubscriber extends Socket {
  constructor(options?: SocketOptions & XSubscriberOptions)
}

interface StreamOptions {
  notify?: boolean
}

interface StreamConnectOptions {
  routingId?: string
}

export class Stream extends Socket {
  notify: boolean

  constructor(options?: SocketOptions & StreamOptions)
  connect(address: string, options?: StreamConnectOptions): void
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

  on(event: Event, callback: (details: EventDetails) => any): EventEmitter
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
