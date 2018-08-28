const zmq = require("../..")
const semver = require("semver")
const {assert} = require("chai")
const {spawn} = require("child_process")

describe("context process exit", function() {
  describe("with default context", function() {
    it("should occur when sockets are closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(__dirname)
        const socket1 = new zmq.Dealer
        socket1.close()
        const socket2 = new zmq.Router
        socket2.close()
      })
    })

    it("should not occur when sockets are open", async function() {
      this.slow(750)
      await ensureNoExit(function() {
        const zmq = require(__dirname)
        const socket1 = new zmq.Dealer
        socket1.bind("inproc://foo")
      })
    })
  })

  describe("with custom context", function() {
    it("should occur when sockets are closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(__dirname)
        const context = new zmq.Context
        const socket1 = new zmq.Dealer({context})
        socket1.close()
        const socket2 = new zmq.Router({context})
        socket2.close()
        context.close()
      })
    })
  })
})

async function ensureExit(fn) {
  return new Promise((resolve) => {
    const child = spawn(process.argv[0])
    child.stdin.write(`(${fn})()`)
    child.stdin.end()

    child.stdout.on("data", data => console.log(data.toString()))
    child.stderr.on("data", data => console.error(data.toString()))

    child.on("close", (code) => {
      assert.equal(code, 0)
      resolve()
    })
  })
}

async function ensureNoExit(fn) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.argv[0])
    child.stdin.write(`(${fn})()`)
    child.stdin.end()

    child.stdout.on("data", data => console.log(data.toString()))
    child.stderr.on("data", data => console.error(data.toString()))

    child.on("close", (code) => {
      reject(new Error(`Exit with code ${code}`))
    })

    setTimeout(() => {
      resolve()
      child.kill()
    }, 500)
  })
}
