/* Number of messages per benchmark. */
const n = parseInt(process.env.N, 10) || 5000

/* Which benchmarks to run. */
const benchmarks = [
  "queue",
  "deliver",
  "deliver-multipart",
]

/* Transport protocols to benchmark. */
const protos = [
  "tcp",
  "inproc",
  // "ipc",
]

/* Which message part sizes to benchmark (exponentially increasing). */
const msgsizes = [
  0, // 16^0 = 1
  1, // 16^1 = 16
  2, // 16^2 = 256
  3, // ...
  4,
  5,
  // 6,
].map(n => 16 ** n)

/* Set the exported libraries: current and next-gen. */
const zmq = {
  /* Assumes zeromq.js directory is checked out in a directory next to this. */
  cur: require("../../../zeromq.js"),
  ng: require("../.."),
}


/* Continue to load and execute benchmarks. */
const {uniqAddress} = require("../unit/helpers")

const fs = require("fs")
const bench = require("benchmark")
const suite = new bench.Suite

const benchOptions = {
  defer: true,
  delay: 0.1,
  onError: console.error,
}

for (const benchmark of benchmarks) {
  for (const proto of protos) {
    const address = uniqAddress(proto)
    for (const msgsize of msgsizes) {
      eval(fs.readFileSync(`${__dirname}/${benchmark}.js`).toString())
    }
  }
}

suite.on("cycle", ({target}) => {
  console.log(target.toString())
})

suite.on("complete", () => {
  console.log("Completed.")
  process.exit(0)
})

console.log("Running benchmarks...")
suite.run()
