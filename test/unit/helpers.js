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

module.exports = {uniqAddress}
