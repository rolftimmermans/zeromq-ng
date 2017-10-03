// const zmq = require("../..")
// const {assert} = require("chai")
//
// for (const address of ["inproc://pair", "tcp://127.0.0.1:10001"]) {
//   describe(`socket pair with ${address.split(":").shift()}`, function() {
//     beforeEach(function() {
//       this.sockA = zmq.socket("pair")
//       this.sockB = zmq.socket("pair")
//     })
//
//     afterEach(function() {
//       this.sockA.close()
//       this.sockB.close()
//     })
//
//     describe("send", function() {
//       it("should deliver messages", function(done) {
//         /* PAIR  -> foo ->  PAIR
//            [A]   -> bar ->  [B]
//                  -> baz ->  responds when received
//                  -> qux ->
//                  <- foo <-
//                  <- bar <-
//                  <- baz <-
//                  <- qux <-
//          */
//
//         const messages = ["foo", "bar", "baz", "qux"]
//         const received = []
//         let i = 0
//
//         this.sockB.on("message", msg => {
//           assert.instanceOf(msg, Buffer)
//           this.sockB.send(msg)
//         })
//
//         this.sockA.on("message", msg => {
//           assert.instanceOf(msg, Buffer)
//
//           i++
//           received.push(msg.toString())
//
//           if (i == messages.length) {
//             assert.deepEqual(received, messages)
//             done()
//           }
//         })
//
//         this.sockB.bind(address).then(() => {
//           this.sockA.connect(address)
//
//           for (const msg of messages) {
//             this.sockA.send(msg)
//           }
//         })
//       })
//     })
//   })
// }
