const zmq = require(".")
const {EventEmitter} = require("events")


let count = 1
const types = {
  ZMQ_PAIR: 0,
  ZMQ_PUB: 1,
  ZMQ_SUB: 2,
  ZMQ_REQ: 3,
  ZMQ_REP: 4,
  ZMQ_DEALER: 5,
  ZMQ_XREQ: 5,
  ZMQ_ROUTER: 6,
  ZMQ_XREP: 6,
  ZMQ_PULL: 7,
  ZMQ_PUSH: 8,
  ZMQ_XPUB: 9,
  ZMQ_XSUB: 10,
  ZMQ_STREAM: 11,
}

const longOptions = {
  ZMQ_AFFINITY: 4,
  ZMQ_IDENTITY: 5,
  ZMQ_SUBSCRIBE: 6,
  ZMQ_UNSUBSCRIBE: 7,
  ZMQ_RATE: 8,
  ZMQ_RECOVERY_IVL: 9,
  ZMQ_SNDBUF: 11,
  ZMQ_RCVBUF: 12,
  ZMQ_RCVMORE: 13,
  ZMQ_FD: 14,
  ZMQ_EVENTS: 15,
  ZMQ_TYPE: 16,
  ZMQ_LINGER: 17,
  ZMQ_RECONNECT_IVL: 18,
  ZMQ_BACKLOG: 19,
  ZMQ_RECONNECT_IVL_MAX: 21,
  ZMQ_MAXMSGSIZE: 22,
  ZMQ_SNDHWM: 23,
  ZMQ_RCVHWM: 24,
  ZMQ_MULTICAST_HOPS: 25,
  ZMQ_RCVTIMEO: 27,
  ZMQ_SNDTIMEO: 28,
  ZMQ_IPV4ONLY: 31,
  ZMQ_LAST_ENDPOINT: 32,
  ZMQ_ROUTER_MANDATORY: 33,
  ZMQ_TCP_KEEPALIVE: 34,
  ZMQ_TCP_KEEPALIVE_CNT: 35,
  ZMQ_TCP_KEEPALIVE_IDLE: 36,
  ZMQ_TCP_KEEPALIVE_INTVL: 37,
  ZMQ_TCP_ACCEPT_FILTER: 38,
  ZMQ_DELAY_ATTACH_ON_CONNECT: 39,
  ZMQ_XPUB_VERBOSE: 40,
  ZMQ_ROUTER_RAW: 41,
  ZMQ_IPV6: 42,
  ZMQ_MECHANISM: 43,
  ZMQ_PLAIN_SERVER: 44,
  ZMQ_PLAIN_USERNAME: 45,
  ZMQ_PLAIN_PASSWORD: 46,
  ZMQ_CURVE_SERVER: 47,
  ZMQ_CURVE_PUBLICKEY: 48,
  ZMQ_CURVE_SECRETKEY: 49,
  ZMQ_CURVE_SERVERKEY: 50,
  ZMQ_ZAP_DOMAIN: 55,
  ZMQ_HEARTBEAT_IVL: 75,
  ZMQ_HEARTBEAT_TTL: 76,
  ZMQ_HEARTBEAT_TIMEOUT: 77,
  ZMQ_CONNECT_TIMEOUT: 79,
  ZMQ_IO_THREADS: 1,
  ZMQ_MAX_SOCKETS: 2,
  ZMQ_ROUTER_HANDOVER: 56,
}

const pollStates = {
  ZMQ_POLLIN: 1,
  ZMQ_POLLOUT: 2,
  ZMQ_POLLERR: 4,
}

const sendOptions = {
  ZMQ_SNDMORE: 2,
}

const capabilities = {
  ZMQ_CAN_MONITOR: 1,
  ZMQ_CAN_DISCONNECT: 1,
  ZMQ_CAN_UNBIND: 1,
  ZMQ_CAN_SET_CTX: 1,
}

const socketStates = {
  STATE_READY: 0,
  STATE_BUSY: 1,
  STATE_CLOSED: 2,
}

const shortOptions = {
  _fd: longOptions.ZMQ_FD,
  _ioevents: longOptions.ZMQ_EVENTS,
  _receiveMore: longOptions.ZMQ_RCVMORE,
  _subscribe: longOptions.ZMQ_SUBSCRIBE,
  _unsubscribe: longOptions.ZMQ_UNSUBSCRIBE,
  affinity: longOptions.ZMQ_AFFINITY,
  backlog: longOptions.ZMQ_BACKLOG,
  identity: longOptions.ZMQ_IDENTITY,
  linger: longOptions.ZMQ_LINGER,
  rate: longOptions.ZMQ_RATE,
  rcvbuf: longOptions.ZMQ_RCVBUF,
  last_endpoint: longOptions.ZMQ_LAST_ENDPOINT,
  reconnect_ivl: longOptions.ZMQ_RECONNECT_IVL,
  recovery_ivl: longOptions.ZMQ_RECOVERY_IVL,
  sndbuf: longOptions.ZMQ_SNDBUF,
  mechanism: longOptions.ZMQ_MECHANISM,
  plain_server: longOptions.ZMQ_PLAIN_SERVER,
  plain_username: longOptions.ZMQ_PLAIN_USERNAME,
  plain_password: longOptions.ZMQ_PLAIN_PASSWORD,
  curve_server: longOptions.ZMQ_CURVE_SERVER,
  curve_publickey: longOptions.ZMQ_CURVE_PUBLICKEY,
  curve_secretkey: longOptions.ZMQ_CURVE_SECRETKEY,
  curve_serverkey: longOptions.ZMQ_CURVE_SERVERKEY,
  zap_domain: longOptions.ZMQ_ZAP_DOMAIN,
  heartbeat_ivl: longOptions.ZMQ_HEARTBEAT_IVL,
  heartbeat_ttl: longOptions.ZMQ_HEARTBEAT_TTL,
  heartbeat_timeout: longOptions.ZMQ_HEARTBEAT_TIMEOUT,
  connect_timeout: longOptions.ZMQ_CONNECT_TIMEOUT,
}

function delay(fn) {
  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      try {
        fn().then(resolve).catch(reject)
      } catch(err) {
        reject(err)
      }
    })
  })
}

class Context {
  constructor() {
    throw new Error("Context cannot be instantiated in compatibility mode")
  }

  static setMaxThreads(value) {
    zmq.global.ioThreads = value
  }

  static getMaxThreads() {
    return zmq.global.ioThreads
  }

  static setMaxSockets(value) {
    zmq.global.maxSockets = value
  }

  static getMaxSockets() {
    return zmq.global.maxSockets
  }
}

class Socket extends EventEmitter {
  constructor(type) {
    super()
    this.type = type

    this._msg = []
    this._recvQueue = []
    this._sendQueue = []
    this._paused = false

    switch (type) {
    case "pair": this._socket = new zmq.Pair; break
    case "req": this._socket = new zmq.Request; break
    case "rep": this._socket = new zmq.Response; break
    case "pub": this._socket = new zmq.Publisher; break
    case "sub": this._socket = new zmq.Subscriber; break
    case "dealer": case "xreq": this._socket = new zmq.Dealer; break
    case "router": case "xrep": this._socket = new zmq.Router; break
    case "pull": this._socket = new zmq.Pull; break
    case "push": this._socket = new zmq.Push; break
    case "xpub": this._socket = new zmq.XPublisher; break
    case "xsub": this._socket = new zmq.XSubscriber; break
    case "stream": this._socket = new zmq.Stream; break
    }

    const recv = async () => {
      this.once("_flushRecv", async () => {
        while (!this._socket.closed && !this._paused) {
          await this._recv()
        }

        if (!this._socket.closed) recv()
      })
    }

    const send = () => {
      this.once("_flushSend", async () => {
        while (!this._socket.closed && !this._paused && this._sendQueue.length) {
          await this._send()
        }

        if (!this._socket.closed) send()
      })
    }

    if (type != "push" && type != "pub") recv()
    send()

    this.emit("_flushRecv")
  }

  async _recv() {
    try {
      if (this._recvQueue.length) {
        const msg = this._recvQueue.shift()
        this.emit("message", ...msg)
      }

      const msg = await this._socket.receive()
      if (this._paused) {
        this._recvQueue.push(msg)
      } else {
        this.emit("message", ...msg)
      }
    } catch(err) {
      if (!this._socket.closed && err.code != "EBUSY") {
        this.emit("error", err)
      }
    }
  }

  async _send() {
    const [msg, cb] = this._sendQueue.shift()
    try {
      await this._socket.send(msg)
      if (cb) cb()
    } catch(err) {
      if (cb) {
        cb(err)
      } else {
        this.emit("error", err)
      }
    }
  }

  bind(address, cb) {
    /* TODO: There might be some issues calling the microtask queue from C++
       that cause the need to run callbacks in the next tick. */
    delay(() => this._socket.bind(address)).then(() => {
      this.emit("bind", address)
      if (cb) cb()
    }).catch(err => {
      if (cb) {
        cb(err)
      } else {
        this.emit("error", err)
      }
    })

    return this
  }

  unbind(address, cb) {
    /* TODO: There might be some issues calling the microtask queue from C++
       that cause the need to run callbacks in the next tick. */
    delay(() => this._socket.unbind(address)).then(() => {
      this.emit("unbind", address)
      if (cb) cb()
    }).catch(err => {
      if (cb) {
        cb(err)
      } else {
        this.emit("error", err)
      }
    })

    return this
  }

  connect(address) {
    this._socket.connect(address)
    return this
  }

  disconnect(address) {
    this._socket.disconnect(address)
    return this
  }

  send(message, flags, cb) {
    flags = flags | 0
    this._msg = this._msg.concat(message)
    if ((flags & sendOptions.ZMQ_SNDMORE) === 0) {
      this._sendQueue.push([this._msg, cb])
      this._msg = []
      if (!this._paused) this.emit("_flushSend")
    }
    return this
  }

  read() {
    throw new Error("read() has been removed from compatibility mode; use on('message', ...) instead.")
  }

  bindSync() {
    throw new Error("bindSync() has been removed from compatibility mode; use bind() instead")
  }

  unbindSync() {
    throw new Error("unbindSync() has been removed from compatibility mode; use unbind() instead")
  }

  pause() {
    this._paused = true
  }

  resume() {
    this._paused = false
    this.emit("_flushRecv")
    this.emit("_flushSend")
  }

  close() {
    this._socket.close()
    return this
  }

  get closed() {
    return this._socket.closed
  }

  monitor(interval, num) {
    this._count = count++

    if (interval || num) {
      process.emitWarning("Arguments to monitor() are ignored in compatibility mode; all events are read automatically")
    }

    const events = this._socket.events

    const read = async () => {
      while (!events.closed) {
        try {
          let [event, data] = await events.receive()
          if (event == "stop") return

          switch (event) {
          case "connectDelay": event = "connect_delay"; break
          case "connectRetry": event = "connect_retry"; break
          case "listening": event = "listen"; break
          case "bindError": event = "bind_error"; break
          case "acceptError": event = "accept_error"; break
          case "closeError": event = "close_error"; break
          }

          const value = data.reconnectInterval || (data.error ? data.error.errno : 0)
          this.emit(event, value, data.address, data.error)
        } catch(err) {
          if (!this._socket.closed) {
            this.emit("error", err)
          }
        }
      }
    }

    read()
    return this
  }

  unmonitor() {
    this._socket.events.close()
    return this
  }

  subscribe(filter) {
    this._socket.subscribe(filter)
    return this
  }

  unsubscribe(filter) {
    this._socket.unsubscribe(filter)
    return this
  }

  setsockopt(option, value) {
    option = shortOptions[option] || option

    switch (option) {
    case longOptions.ZMQ_AFFINITY: this._socket.affinity = value; break
    case longOptions.ZMQ_IDENTITY: this._socket.routingId = value; break
    case longOptions.ZMQ_SUBSCRIBE: this._socket.subscribe(value); break
    case longOptions.ZMQ_UNSUBSCRIBE: this._socket.unsubscribe(value); break
    case longOptions.ZMQ_RATE: this._socket.rate = value; break
    case longOptions.ZMQ_RECOVERY_IVL: this._socket.recoveryInterval = value; break
    case longOptions.ZMQ_SNDBUF: this._socket.sendBufferSize = value; break
    case longOptions.ZMQ_RCVBUF: this._socket.receiveBufferSize = value; break
    case longOptions.ZMQ_LINGER: this._socket.linger = value; break
    case longOptions.ZMQ_RECONNECT_IVL: this._socket.reconnectInterval = value; break
    case longOptions.ZMQ_BACKLOG: this._socket.backlog = value; break
    case longOptions.ZMQ_RECOVERY_IVL_MSEC: this._socket.recoveryInterval = value; break
    case longOptions.ZMQ_RECONNECT_IVL_MAX: this._socket.reconnectMaxInterval = value; break
    case longOptions.ZMQ_MAXMSGSIZE: this._socket.maxMessageSize = value; break
    case longOptions.ZMQ_SNDHWM: this._socket.sendHighWaterMark = value; break
    case longOptions.ZMQ_RCVHWM: this._socket.receiveHighWaterMark = value; break
    case longOptions.ZMQ_MULTICAST_HOPS: this._socket.multicastHops = value; break
    case longOptions.ZMQ_RCVTIMEO: this._socket.receiveTimeout = value; break
    case longOptions.ZMQ_SNDTIMEO: this._socket.sendTimeout = value; break
    case longOptions.ZMQ_IPV4ONLY: this._socket.ipv6 = !value; break
    case longOptions.ZMQ_ROUTER_MANDATORY: this._socket.mandatory = !!value; break
    case longOptions.ZMQ_TCP_KEEPALIVE: this._socket.tcpKeepalive = value; break
    case longOptions.ZMQ_TCP_KEEPALIVE_CNT: this._socket.tcpKeepaliveCount = value; break
    case longOptions.ZMQ_TCP_KEEPALIVE_IDLE: this._socket.tcpKeepaliveIdle = value; break
    case longOptions.ZMQ_TCP_KEEPALIVE_INTVL: this._socket.tcpKeepaliveInterval = value; break
    case longOptions.ZMQ_TCP_ACCEPT_FILTER: this._socket.tcpAcceptFilter = value; break
    case longOptions.ZMQ_DELAY_ATTACH_ON_CONNECT: this._socket.immediate = !!value; break
    case longOptions.ZMQ_XPUB_VERBOSE: this._socket.verbose = !!value; break
    case longOptions.ZMQ_ROUTER_RAW: this._socket.raw = !!value; break
    case longOptions.ZMQ_IPV6: this._socket.ipv6 = !!value; break
    case longOptions.ZMQ_PLAIN_SERVER: this._socket.plainServer = !!value; break
    case longOptions.ZMQ_PLAIN_USERNAME: this._socket.plainUsername = value; break
    case longOptions.ZMQ_PLAIN_PASSWORD: this._socket.plainPassword = value; break
    case longOptions.ZMQ_CURVE_SERVER: this._socket.curveServer = !!value; break
    case longOptions.ZMQ_CURVE_PUBLICKEY: this._socket.curvePublicKey = value; break
    case longOptions.ZMQ_CURVE_SECRETKEY: this._socket.curveSecretKey = value; break
    case longOptions.ZMQ_CURVE_SERVERKEY: this._socket.curveServerKey = value; break
    case longOptions.ZMQ_ZAP_DOMAIN: this._socket.zapDomain = value; break
    case longOptions.ZMQ_HEARTBEAT_IVL: this._socket.heartbeatInterval = value; break
    case longOptions.ZMQ_HEARTBEAT_TTL: this._socket.heartbeatTimeToLive = value; break
    case longOptions.ZMQ_HEARTBEAT_TIMEOUT: this._socket.heartbeatTimeout = value; break
    case longOptions.ZMQ_CONNECT_TIMEOUT: this._socket.connectTimeout = value; break
    case longOptions.ZMQ_ROUTER_HANDOVER: this._socket.handover = !!value; break
    default: throw new Error("Unknown option")
    }

    return this
  }

  getsockopt(option) {
    option = shortOptions[option] || option

    switch (option) {
    case longOptions.ZMQ_AFFINITY: return this._socket.affinity
    case longOptions.ZMQ_IDENTITY: return this._socket.routingId
    case longOptions.ZMQ_RATE: return this._socket.rate
    case longOptions.ZMQ_RECOVERY_IVL: return this._socket.recoveryInterval
    case longOptions.ZMQ_SNDBUF: return this._socket.sendBufferSize
    case longOptions.ZMQ_RCVBUF: return this._socket.receiveBufferSize
    case longOptions.ZMQ_RCVMORE: throw new Error("ZMQ_RCVMORE is not supported in compatibility mode")
    case longOptions.ZMQ_FD: throw new Error("ZMQ_FD is not supported in compatibility mode")
    case longOptions.ZMQ_EVENTS: return (this._socket.readable ? pollStates.ZMQ_POLLIN : 0) | (this._socket.writable ? pollStates.ZMQ_POLLOUT : 0)
    case longOptions.ZMQ_TYPE: return this._socket.type
    case longOptions.ZMQ_LINGER: return this._socket.linger
    case longOptions.ZMQ_RECONNECT_IVL: return this._socket.reconnectInterval
    case longOptions.ZMQ_BACKLOG: return this._socket.backlog
    case longOptions.ZMQ_RECOVERY_IVL_MSEC: return this._socket.recoveryInterval
    case longOptions.ZMQ_RECONNECT_IVL_MAX: return this._socket.reconnectMaxInterval
    case longOptions.ZMQ_MAXMSGSIZE: return this._socket.maxMessageSize
    case longOptions.ZMQ_SNDHWM: return this._socket.sendHighWaterMark
    case longOptions.ZMQ_RCVHWM: return this._socket.receiveHighWaterMark
    case longOptions.ZMQ_MULTICAST_HOPS: return this._socket.multicastHops
    case longOptions.ZMQ_RCVTIMEO: return this._socket.receiveTimeout
    case longOptions.ZMQ_SNDTIMEO: return this._socket.sendTimeout
    case longOptions.ZMQ_IPV4ONLY: return !this._socket.ipv6
    case longOptions.ZMQ_LAST_ENDPOINT: return this._socket.lastEndpoint
    case longOptions.ZMQ_ROUTER_MANDATORY: return this._socket.mandatory ? 1 : 0
    case longOptions.ZMQ_TCP_KEEPALIVE: return this._socket.tcpKeepalive
    case longOptions.ZMQ_TCP_KEEPALIVE_CNT: return this._socket.tcpKeepaliveCount
    case longOptions.ZMQ_TCP_KEEPALIVE_IDLE: return this._socket.tcpKeepaliveIdle
    case longOptions.ZMQ_TCP_KEEPALIVE_INTVL: return this._socket.tcpKeepaliveInterval
    case longOptions.ZMQ_DELAY_ATTACH_ON_CONNECT: return this._socket.immediate ? 1 : 0
    case longOptions.ZMQ_XPUB_VERBOSE: return this._socket.verbose ? 1 : 0
    case longOptions.ZMQ_ROUTER_RAW: return this._socket.raw ? 1 : 0
    case longOptions.ZMQ_IPV6: return this._socket.ipv6 ? 1 : 0
    case longOptions.ZMQ_MECHANISM:
      switch (this._socket.mechanism) {
      case "plain": return 1
      case "curve": return 2
      case "gssapi": return 3
      default: return 0
      }
    case longOptions.ZMQ_PLAIN_SERVER: return this._socket.plainServer ? 1 : 0
    case longOptions.ZMQ_PLAIN_USERNAME: return this._socket.plainUsername
    case longOptions.ZMQ_PLAIN_PASSWORD: return this._socket.plainPassword
    case longOptions.ZMQ_CURVE_SERVER: return this._socket.curveServer ? 1 : 0
    case longOptions.ZMQ_CURVE_PUBLICKEY: return this._socket.curvePublicKey
    case longOptions.ZMQ_CURVE_SECRETKEY: return this._socket.curveSecretKey
    case longOptions.ZMQ_CURVE_SERVERKEY: return this._socket.curveServerKey
    case longOptions.ZMQ_ZAP_DOMAIN: return this._socket.zapDomain
    case longOptions.ZMQ_HEARTBEAT_IVL: return this._socket.heartbeatInterval
    case longOptions.ZMQ_HEARTBEAT_TTL: return this._socket.heartbeatTimeToLive
    case longOptions.ZMQ_HEARTBEAT_TIMEOUT: return this._socket.heartbeatTimeout
    case longOptions.ZMQ_CONNECT_TIMEOUT: return this._socket.connectTimeout
    default: throw new Error("Unknown option")
    }
  }
}

Object.keys(shortOptions).forEach(function(name) {
  Socket.prototype.__defineGetter__(name, function() {
    return this.getsockopt(shortOptions[name])
  })

  Socket.prototype.__defineSetter__(name, function(val) {
    if ("string" == typeof val) val = new Buffer(val, "utf8")
    return this.setsockopt(shortOptions[name], val)
  })
})

function createSocket(type, options = {}) {
  const sock = new Socket(type)
  for (const key in options) sock[key] = options[key]
  return sock
}

function curveKeypair() {
  const {publicKey, secretKey} = zmq.curveKeypair()
  return {public: publicKey, secret: secretKey}
}

function proxy(frontend, backend, capture) {
  switch (frontend.type + "/" + backend.type) {
  case "push/pull":
  case "pull/push":
  case "xpub/xsub":
    frontend.on("message", function() {
      backend.send([].slice.call(arguments))
    })

    if (capture) {
      backend.on("message", function() {
        frontend.send([].slice.call(arguments))
        capture.send([].slice.call(arguments))
      })
    } else {
      backend.on("message", function() {
        frontend.send([].slice.call(arguments))
      })
    }
    break

  case "router/dealer":
  case "xrep/xreq":
    frontend.on("message", function(id, delimiter, msg) {
      backend.send([id, delimiter, msg])
    })

    if (capture) {
      backend.on("message", function(id, delimiter, msg) {
        frontend.send([id, delimiter, msg])
        capture.send(msg)
      })
    } else {
      backend.on("message", function(id, delimiter, msg) {
        frontend.send([id, delimiter, msg])
      })
    }
    break

  default:
    throw new Error("This socket type order is not supported in compatibility mode")
  }
}

Object.assign(module.exports, {
  version: zmq.version,
  Context,
  Socket,
  socket: createSocket,
  createSocket,
  curveKeypair,
  proxy,
  options: shortOptions,
})

Object.assign(module.exports, longOptions)
Object.assign(module.exports, types)
Object.assign(module.exports, pollStates)
Object.assign(module.exports, sendOptions)
Object.assign(module.exports, socketStates)
Object.assign(module.exports, capabilities)
