const zmq = require("../..")
const {assert} = require("chai")
const {EventEmitter} = require("events")

describe("proxy construction", function() {
  afterEach(function() {
    gc()
  })

  describe("with constructor", function() {
    it("should throw if called as function", function() {
      assert.throws(
        () => zmq.Proxy(),
        TypeError,
        "Class constructors cannot be invoked without 'new'",
      )
    })

    it("should throw with too few arguments", function() {
      assert.throws(
        () => new zmq.Proxy,
        TypeError,
        "Front-end must be a socket object",
      )
    })

    it("should throw with too many arguments", function() {
      assert.throws(
        () => new zmq.Proxy(new zmq.Dealer, new zmq.Dealer, new zmq.Dealer),
        TypeError,
        "Expected 2 arguments",
      )
    })

    it("should throw with invalid socket", function() {
      assert.throws(
        () => new zmq.Proxy({}, {}),
        Error,
        "Invalid pointer passed as argument",
      )
    })
  })
})
