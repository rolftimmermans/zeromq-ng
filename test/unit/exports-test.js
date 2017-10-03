const zmq = require("../..")
const {assert} = require("chai")

describe("exports", function() {
  it("should include functions and constructors", function() {
    assert.deepEqual(
      Object.keys(zmq),
      [
        /* Utility functions. */
        "version", "capability",

        /* The global/default context. */
        "global",

        /* Generic constructors. */
        "Context", "Socket",

        /* Specific socket constructors. */
        "Pair", "Publisher", "Subscriber", "Request", "Response",
        "Dealer", "Router", "Pull", "Push", "XPublisher", "XSubscriber",
        "Stream",
      ]
    )
  })
})
