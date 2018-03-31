const zmq = require("../..")
const semver = require("semver")

/* Windows cannot bind on a ports just above 1014; start higher to be safe. */
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

function testProtos(...requested) {
  const set = new Set(requested)

  /* Do not test with ipc if unsupported. */
  if (!zmq.capability.ipc) set.delete("ipc")

  /* Only test inproc with version 4.2+, earlier versions are unreliable. */
  if (semver.satisfies(zmq.version, "< 4.2")) set.delete("inproc")

  if (set.empty) console.error("Warning: test protocol set is empty")

  return [...set]
}

module.exports = {testProtos, uniqAddress}
