### v5.0.0-beta.21

* BREAKING: Removed all socket option aliases so that all options only have a single accessor.

* Deduplicate options from TypeScript definitions.

### v5.0.0-beta.19 / v5.0.0-beta.20

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
