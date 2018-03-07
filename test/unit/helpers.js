const zmq = require("../..")
const semver = require("semver")

/* Windows cannot bind on a ports just above 1014; start at 2000 to be safe. */
let seq = 5000

function uniqAddress(proto) {
  const id = seq++
  switch (proto) {
  case "ipc":
    return `${proto}://${__dirname}/../../tmp/${proto}-${id}`
  case "tcp":
    return `${proto}://127.0.0.1:${id}`
  default:
    return `${proto}://${proto}-${id}`
  }
}

/* Always test with tcp. */
const testProtos = ["tcp"]

/* Do not test with ipc if unsupported. */
if (zmq.capability.ipc) testProtos.push("ipc")

/* Only test inproc with version 4.2+, earlier versions are unreliable. */
if (semver.satisfies(zmq.version, ">= 4.2")) testProtos.push("inproc")

module.exports = {testProtos, uniqAddress}
