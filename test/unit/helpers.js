let seq = 1024
function uniqAddress(proto) {
  const id = seq++
  switch (proto) {
  case "ipc":
    return `${proto}://tmp/${proto}-${id}`
  case "tcp":
    return `${proto}://127.0.0.1:${id}`
  default:
    return `${proto}://${proto}-${id}`
  }
}

module.exports = {uniqAddress}
