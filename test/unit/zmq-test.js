const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")

describe("zmq", function() {
  describe("exports", function() {
    it("should include functions and constructors", function() {
      const expected = [
        /* Utility functions. */
        "version", "capability", "curveKeypair",

        /* The global/default context. */
        "global",

        /* Generic constructors. */
        "Context", "Socket", "Observer", "Proxy",

        /* Specific socket constructors. */
        "Pair", "Publisher", "Subscriber", "Request", "Response",
        "Dealer", "Router", "Pull", "Push", "XPublisher", "XSubscriber",
        "Stream",
      ]

      /* ZMQ < 4.0.5 has no steerable proxy support. */
      if (semver.satisfies(zmq.version, "< 4.0.5")) {
        expected.splice(expected.indexOf("Proxy"), 1)
      }

      assert.sameMembers(Object.keys(zmq), expected)
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
    beforeEach(function() {
      if (!zmq.capability.curve) this.skip()
    })

    it("should return keypair", function() {
      const {publicKey, secretKey} = zmq.curveKeypair()
      assert.match(publicKey, /^[\x20-\x7F]{40}$/)
      assert.match(secretKey, /^[\x20-\x7F]{40}$/)
    })
  })
})
