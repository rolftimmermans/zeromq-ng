/* Number of messages per benchmark. */
const n = parseInt(process.env.N, 10) || 5000

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

/* Which benchmarks to run. */
const benchmarks = {
  "create-socket": {n, options: {delay: 0.5}},
  "queue": {n, msgsizes},
  "deliver": {n, protos, msgsizes},
  "deliver-multipart": {n, protos, msgsizes},
  "deliver-async-iterator": {n, protos, msgsizes},
}

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

const defaultOptions = {
  defer: true,
  delay: 0.1,
  onError: console.error,
}

for (const [benchmark, {n, protos, msgsizes, options}] of Object.entries(benchmarks)) {
  let load = ({n, proto, msgsize, address}) => {
    const benchOptions = Object.assign({}, defaultOptions, options)
    eval(fs.readFileSync(`${__dirname}/${benchmark}.js`).toString())
  }

  if (protos && msgsizes) {
    for (const proto of protos) {
      const address = uniqAddress(proto)
      for (const msgsize of msgsizes) {
        load({n, proto, msgsize, address})
      }
    }
  } else if (msgsizes) {
    const address = uniqAddress("tcp")
    for (const msgsize of msgsizes) {
      load({n, msgsize, address})
    }
  } else {
    load({n})
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
