const zmq = require("../..")
const {assert} = require("chai")

describe("socket options", function() {
  afterEach(function() {
    gc()
  })

  it("should set and get bool socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.immediate, false)
    sock.immediate = true
    assert.equal(sock.immediate, true)
  })

  it("should set and get int socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.backlog, 100)
    sock.backlog = 75
    assert.equal(sock.backlog, 75)
  })

  it("should set and get int64 socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.maxMessageSize, -1)
    sock.maxMessageSize = 0xffffffff
    assert.equal(sock.maxMessageSize, 0xffffffff)
  })

  it("should set and get string socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.identity, null)
    sock.identity = "åbçdéfghïjk"
    assert.equal(sock.identity, "åbçdéfghïjk")
  })

  it("should set and get string socket option as buffer", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.identity, null)
    sock.identity = Buffer.from("åbçdéfghïjk")
    assert.equal(sock.identity, "åbçdéfghïjk")
  })

  it("should set and get string socket option to null", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.zapDomain, null)
    sock.zapDomain = Buffer.from("foo")
    assert.equal(sock.zapDomain, "foo")
    sock.zapDomain = null
    assert.equal(sock.zapDomain, null)
  })

  it("should set and get bool socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getBoolOption(39), false)
    sock.setBoolOption(39, true)
    assert.equal(sock.getBoolOption(39), true)
  })

  it("should set and get int32 socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getInt32Option(19), 100)
    sock.setInt32Option(19, 75)
    assert.equal(sock.getInt32Option(19), 75)
  })

  it("should set and get int64 socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getInt64Option(22), -1)
    sock.setInt64Option(22, 0xffffffffffff)
    assert.equal(sock.getInt64Option(22), 0xffffffffffff)
  })

  it.skip("should set and get uint64 socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getUInt64Option(4), 0)
    sock.setUInt64Option(4, 0xffffffffffffffff)
    assert.equal(sock.getUInt64Option(4), 0xffffffffffffffff)
  })

  it("should set and get string socket option", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getStringOption(5), null)
    sock.setStringOption(5, "åbçdéfghïjk")
    assert.equal(sock.getStringOption(5), "åbçdéfghïjk")
  })

  it("should set and get string socket option as buffer", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getStringOption(5), null)
    sock.setStringOption(5, Buffer.from("åbçdéfghïjk"))
    assert.equal(sock.getStringOption(5), "åbçdéfghïjk")
  })

  it("should set and get string socket option to null", function() {
    const sock = new zmq.Dealer
    assert.equal(sock.getStringOption(55), null)
    sock.setStringOption(55, Buffer.from("åbçdéfghïjk"))
    assert.equal(sock.getStringOption(55), Buffer.from("åbçdéfghïjk"))
    sock.setStringOption(55, null)
    assert.equal(sock.getStringOption(55), null)
  })

  it("should throw for readonly option", function() {
    const sock = new zmq.Dealer
    assert.throws(
      () => sock.mechanism = 1,
      TypeError,
      "Cannot set property mechanism of #<Socket> which has only a getter"
    )
  })

  it("should throw for unknown option", function() {
    const sock = new zmq.Dealer
    assert.throws(
      () => sock.doesNotExist = 1,
      TypeError,
      "Cannot add property doesNotExist, object is not extensible"
    )
  })

  describe("warnings", function() {
    beforeEach(function() {
      this.warningListeners = process.listeners("warning")
    })

    afterEach(function() {
      process.removeAllListeners("warning")
      for (const listener of this.warningListeners) {
        process.on("warning", listener)
      }
    })

    it("should be emitted for set after connect", async function() {
      const warnings = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer
      sock.connect("inproc://foo")
      sock.identity = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind"]
      )

      sock.close()
    })

    it("should be emitted for set during bind", async function() {
      const warnings = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer
      const promise = sock.bind("inproc://foo")
      sock.identity = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind"]
      )

      await promise
      sock.close()
    })

    it("should be emitted for set after bind", async function() {
      const warnings = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer
      await sock.bind("inproc://bar")
      sock.identity = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind"]
      )

      sock.close()
    })
  })
})