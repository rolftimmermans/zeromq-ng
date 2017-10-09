const zmq = require("../..")
const semver = require("semver")
const weak = require("weak")
const {assert} = require("chai")
const {uniqAddress} = require("./helpers")

for (const proto of ["inproc", "ipc", "tcp"]) {
  describe(`socket with ${proto} curve send/receive`, function() {
    before(function() {
      if (!zmq.capability.curve) this.skip()
    })

    beforeEach(function() {
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