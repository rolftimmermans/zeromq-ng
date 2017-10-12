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


interface CurveKeypair {
  publicKey: string,
  secretKey: string,
}

export function curveKeypair(): CurveKeypair


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

  send(message: string | Buffer | string[] | Buffer[]): Promise<void>
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

interface ResponseOptions {
  routingId?: string
}

export class Response extends Socket {
  routingId?: string

  constructor(options?: SocketOptions & ResponseOptions)
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
  connectRoutingId?: string
}

export class Router extends Socket {
  routingId?: string
  mandatory: boolean
  probeRouter: boolean
  handover: boolean
  connectRoutingId?: string

  constructor(options?: SocketOptions & RouterOptions)
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
  connectRoutingId?: string
  notify?: boolean
}

export class Stream extends Socket {
  connectRoutingId?: string
  notify: boolean

  constructor(options?: SocketOptions & StreamOptions)
}


type Event = "connect" | "connectDelay" | "connectRetry" | "listening" |
  "bindError" | "accept" | "acceptError" | "close" | "closeError" |
  "disconnect" | "stop" | "unknown"

interface EventDetails {
  address?: string,
  reconnectInterval?: number,
  errno?: number,
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
