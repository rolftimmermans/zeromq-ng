### v5.0.0-beta.28

* Development has moved back to ZeroMQ.js. This provides a simple wrapper around ZeroMQ.js.

### v5.0.0-beta.27

* Support using ZeroMQ in [worker threads](https://nodejs.org/api/worker_threads.html), with the ability to communicate between threads via the `inproc://` protocol.

* Support Node versions that [call destructors](https://github.com/nodejs/node/pull/28428) when the environment is cleaned up.

* Add example for multithreaded usage.

### v5.0.0-beta.26

* BREAKING: Rename the default global context from `global`, which clashes with the built-in variable `global`, to `context`.

* Include documentation inline in source & TypeScript definitions.

### v5.0.0-beta.25

* BREAKING: Events now are returned as objects that include the type, instead of a tuple. Their associated data is now type safe in the TypeScript type definitions.

* BREAKING: Removed send()/receive() and associated options from the base Socket class and assign them only to sockets that can send/receive respectively.

* Other minor TypeScript type improvements.

* Support DRAFT sockets when compiled with `--zmq-draft`. Require with `require("zeromq-ng/draft")`.

* Incoming messages will be copied if they are small. In trivial cases the overhead of sharing memory between JS and ZeroMQ is too big. This is the same strategy as is used for outgoing messages.

### v5.0.0-beta.24

* BREAKING: Reimplemented two interacting boolean properties XPublisher.verbose/verboser as XPublisher.verbosity to make actual the behaviour more obvious.

* Prevent segmentation fault when the Node.js process exits gracefully and messages larger than 32 bytes were queued on sockets that had the linger option disabled.

* Include newer ZeroMQ.js improvements to compatibility layer.

### v5.0.0-beta.23

* BREAKING: Ported all library code to TypeScript so that the typings are easier to match to the actual implementation. The typings may be slightly stricter as a result.

* BREAKING: Socket.defineOption()/Context.defineOption() have been made private. The alternative is to inherit from these classes instead, and define custom getters/setters. This solution works in TypeScript as well.

* Fixed a few bugs in the compatibility layer due to the TypeScript port.

### v5.0.0-beta.21

* BREAKING: Removed all socket option aliases so that all options only have a single accessor.

* Deduplicate options from TypeScript definitions.

* Add new socket options.

### v5.0.0-beta.20

* More platforms with bundled prebuilds.

### v5.0.0-beta.18

* Drop support for Node 8.x.

* Prebuilds are now included in the published NPM package.

* Update bundled version of ZeroMQ to 4.3.2.

### v5.0.0-beta.16

* Use ArrayBufferView instead of TypedArray in TypeScript definition.

### v5.0.0-beta.15

* The node-pre-gyp dependency is now no longer bundled.

* Improvements and bugfixes to TypeScript typings.

* Bugfix in async iterator.

* Move test suite to TypeScript.

### v5.0.0-beta.14

* BREAKING: Renamed socket events to be more predictable and consistent. All events and the associated details are now documented.

* Upgraded bundled version of ZeroMQ to 4.2.5 on Windows (matching the version bundled on other platforms).

* Fix potential use after free error in Socket destruction process.

### v5.0.0-beta.13

* BREAKING: Shutdown behaviour has been revised. All contexts will now automatically be shut down when they go out of scope. It is no longer possible to close contexts manually. When the process exits any open sockets will be closed automatically, and any active context will be terminated. Lingering messages will be sent before the process exits (which may block).

* BREAKING: The method `context.close()` has been removed with no replacement.

* Internal improvements to sending outgoing messages to improve performance.

* Stricter N-API compatibility.

### v5.0.0-beta.12

* BREAKING: The `ZMQ_CONNECT_ROUTING_ID` socket option is now exposed as the `routingId` option of the `connect()` method for `Router` and `Stream` sockets.

* Internal improvements to achieve better performance across all platforms.

* Fix issue with installing on certain Node versions.

### v5.0.0-beta.11

* Published pre-built versions for musl-based Linux distributions on x64 platforms.

* Added socket options that are in the process of being stabilised.

* Upgraded bundled version of ZeroMQ to 4.2.5 on Linux and macOS. The bundled version on Windows is held back at 4.2.2 for now.
