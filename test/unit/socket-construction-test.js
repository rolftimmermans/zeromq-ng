const zmq = require("../..")
const {assert} = require("chai")
const {EventEmitter} = require("events")

describe("socket construction", function() {
  afterEach(function() {
    gc()
  })

  describe("with constructor", function() {
    it("should throw if called as function", function() {
      assert.throws(
        () => zmq.Socket(1, new zmq.Context),
        TypeError,
        "Class constructors cannot be invoked without 'new'",
      )
    })

    it("should throw with too few arguments", function() {
      assert.throws(
        () => new zmq.Socket,
        TypeError,
        "Socket type must be a number",
      )
    })

    it("should throw with too many arguments", function() {
      assert.throws(
        () => new zmq.Socket(1, new zmq.Context, 2),
        TypeError,
        "Expected 2 arguments",
      )
    })

    it("should throw with wrong options argument", function() {
      assert.throws(
        () => new zmq.Socket(3, 1),
        TypeError,
        "Options must be an object",
      )
    })

    it("should throw with wrong type argument", function() {
      assert.throws(
        () => new zmq.Socket("foo", new zmq.Context),
        TypeError,
        "Socket type must be a number",
      )
    })

    it("should throw with wrong type id", function() {
      try {
        new zmq.Socket(37, new zmq.Context)
        assert.ok(false)
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.equal(err.message, "Invalid argument")
        assert.equal(err.code, "EINVAL")
        assert.typeOf(err.errno, "number")
      }
    })

    it("should throw with invalid context", function() {
      try {
        new zmq.Socket(1, {context: {}})
        assert.ok(false)
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.oneOf(err.message, [
          "Invalid pointer passed as argument", /* before 8.7 */
          "Invalid argument", /* as of 8.7 */
        ])
      }
    })

    it("should throw with closed context", function() {
      const context = new zmq.Context
      context.close()

      try {
        new zmq.Socket(1, {context})
        assert.ok(false)
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.equal(err.message, "Context is closed")
        assert.equal(err.code, "EFAULT")
        assert.typeOf(err.errno, "number")
      }
    })

    it("should create socket with default context", function() {
      const sock1 = new zmq.Socket(1)
      const sock2 = new zmq.Socket(1)
      assert.instanceOf(sock1, zmq.Socket)
      assert.equal(sock1.context, sock2.context)
    })

    it("should create socket with given context", function() {
      const context = new zmq.Context
      const socket = new zmq.Socket(1, {context})
      assert.instanceOf(socket, zmq.Socket)
      assert.equal(socket.context, context)
    })
  })

  describe("with child constructor", function() {
    it("should throw if called as function", function() {
      assert.throws(
        () => zmq.Dealer(),
        TypeError,
        "Class constructor Dealer cannot be invoked without 'new'",
      )
    })

    it("should create socket with default context", function() {
      const sock = new zmq.Dealer
      assert.instanceOf(sock, zmq.Dealer)
      assert.equal(sock.context, zmq.global)
    })

    it("should create socket with given context", function() {
      const ctxt = new zmq.Context
      const sock = new zmq.Dealer({context: ctxt})
      assert.instanceOf(sock, zmq.Socket)
      assert.equal(sock.context, ctxt)
    })

    it("should set option", function() {
      const sock = new zmq.Dealer({recoveryInterval: 5})
      assert.equal(sock.recoveryInterval, 5)
    })

    it("should throw with invalid option value", function() {
      assert.throws(
        () => new zmq.Dealer({recoveryInterval: "hello"}),
        TypeError,
        "Option value must be a number"
      )
    })

    it("should throw with readonly option", function() {
      assert.throws(
        () => new zmq.Dealer({mechanism: 1}),
        TypeError,
        "Cannot set property mechanism of #<Socket> which has only a getter"
      )
    })

    it("should throw with unknown option", function() {
      assert.throws(
        () => new zmq.Dealer({doesNotExist: 1}),
        TypeError,
        "Cannot add property doesNotExist, object is not extensible"
      )
    })

    it("should throw error on file descriptor limit", async function() {
      const context = new zmq.Context({maxSockets: 10})
      const sockets = []
      const n = 10

      try {
        for (let i = 0; i < n; i++) {
          sockets.push(new zmq.Dealer({context}))
        }
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.equal(err.message, "Too many open file descriptors")
        assert.equal(err.code, "EMFILE")
        assert.typeOf(err.errno, "number")
      } finally {
        for (const socket of sockets) {
          socket.close()
        }
      }
    })
  })
})
