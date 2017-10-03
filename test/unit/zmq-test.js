const zmq = require("../..")
const {assert} = require("chai")

describe("zmq", function() {
  describe("version", function() {
    it("should return version string", function() {
      assert.match(zmq.version, /^\d+\.\d+\.\d+$/)
    })
  })

  describe("capabilities", function() {
    it("should return library capability", function() {
      assert.deepEqual(
        Object.keys(zmq.capability),
        ["ipc", "pgm", "tipc", "norm", "curve", "gssapi", "draft"]
      )
    })

    it("should return library capability booleans", function() {
      assert.equal(
        Object.values(zmq.capability).every(c => typeof c == "boolean"),
        true
      )
    })
  })
})
