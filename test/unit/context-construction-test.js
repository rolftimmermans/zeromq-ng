const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")

before(function() {
  /* Avoid blocking on unclosed sockets on exit. */
  if (semver.satisfies(zmq.version, ">= 4.2.0")) {
    zmq.global.blocky = false
  }
})

after(function() {
  zmq.global.close()
})

describe("context construction", function() {
  afterEach(function() {
    gc()
  })

  it("should throw if called as function", function() {
    assert.throws(
      () => zmq.Context(),
      TypeError,
      "Class constructors cannot be invoked without 'new'"
    )
  })

  it("should throw with wrong options argument", function() {
    assert.throws(
      () => new zmq.Context(1),
      TypeError,
      "Options must be an object"
    )
  })

  it("should throw with too many arguments", function() {
    assert.throws(
      () => new zmq.Context({}, 2),
      TypeError,
      "Expected 1 argument"
    )
  })

  it("should set option", function() {
    const context = new zmq.Context({ioThreads: 5})
    assert.equal(context.ioThreads, 5)
  })

  it("should throw with invalid option value", function() {
    assert.throws(
      () => new zmq.Context({ioThreads: "hello"}),
      TypeError,
      "Option value must be a number"
    )
  })

  it("should throw with readonly option", function() {
    assert.throws(
      () => new zmq.Context({maxSocketsLimit: 1}),
      TypeError,
      "Cannot set property maxSocketsLimit of #<Context> which has only a getter"
    )
  })

  it("should throw with unknown option", function() {
    assert.throws(
      () => new zmq.Context({doesNotExist: 1}),
      TypeError,
      "Cannot add property doesNotExist, object is not extensible"
    )
  })
})
