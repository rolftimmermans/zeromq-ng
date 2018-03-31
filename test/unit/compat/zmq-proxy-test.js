if (!process.env["NO_COMPAT_TEST"]) {
  const zmq = require("./load")
  const {assert} = require("chai")

  describe("compat proxy", function() {
    it("should be a function off the module namespace", function() {
      assert.typeOf(zmq.proxy, "function")
    })
  })
}
