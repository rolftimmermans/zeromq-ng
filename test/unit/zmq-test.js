const zmq = require("../..")
const {assert} = require("chai")

describe("zmq", function() {
  describe("exports", function() {
    it("should include functions and constructors", function() {
      assert.deepEqual(
        Object.keys(zmq),
        [
          /* Utility functions. */
          "version", "capability", "curveKeypair",

          /* The global/default context. */
          "global",

          /* Generic constructors. */
          "Context", "Socket", "Observer",

          /* Specific socket constructors. */
          "Pair", "Publisher", "Subscriber", "Request", "Response",
          "Dealer", "Router", "Pull", "Push", "XPublisher", "XSubscriber",
          "Stream",
        ]
      )
    })
  })

  describe("version", function() {
    it("should return version string", function() {
      assert.match(zmq.version, /^\d+\.\d+\.\d+$/)
    })
  })

  describe("capability", function() {
    it("should return library capability booleans", function() {
      assert.equal(
        Object.values(zmq.capability).every(c => typeof c == "boolean"),
        true
      )
    })
  })

  describe("curve keypair", function() {
    it("should return keypair", function() {
      if (!zmq.capability.curve) this.skip()

      const {publicKey, secretKey} = zmq.curveKeypair()
      assert.match(publicKey, /^[\x20-\x7F]{40}$/)
      assert.match(secretKey, /^[\x20-\x7F]{40}$/)
    })
  })
})
