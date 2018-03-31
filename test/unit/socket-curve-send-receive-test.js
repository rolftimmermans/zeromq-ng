const zmq = require("../..")
const {assert} = require("chai")
const {testProtos, uniqAddress} = require("./helpers")

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} curve send/receive`, function() {
    beforeEach(function() {
      if (!zmq.capability.curve) this.skip()

      const serverKeypair = zmq.curveKeypair()
      const clientKeypair = zmq.curveKeypair()

      this.sockA = new zmq.Pair({
        linger: 0,
        curveServer: true,
        curvePublicKey: serverKeypair.publicKey,
        curveSecretKey: serverKeypair.secretKey,
      })

      this.sockB = new zmq.Pair({
        linger: 0,
        curveServerKey: serverKeypair.publicKey,
        curvePublicKey: clientKeypair.publicKey,
        curveSecretKey: clientKeypair.secretKey,
      })
    })

    afterEach(function() {
      this.sockA.close()
      this.sockB.close()
      gc()
    })

    describe("when connected", function() {
      beforeEach(async function() {
        if (!zmq.capability.curve) this.skip()

        const address = uniqAddress(proto)
        await this.sockB.bind(address)
        await this.sockA.connect(address)
      })

      it("should deliver single string message", async function() {
        const sent = "foo"
        await this.sockA.send(sent)

        const recv = await this.sockB.receive()
        assert.deepEqual([sent], recv.map(buf => buf.toString()))
      })
    })
  })
}
