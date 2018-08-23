### v5.0.0-beta.12

* The `ZMQ_CONNECT_ROUTING_ID` socket option is now exposed as the `routingId` option of the `connect()` method for `Router` and `Stream` sockets.

* Internal improvements to achieve better performance across all platforms.

* Fix issue with installing on certain Node versions.

### v5.0.0-beta.11

* Published pre-built versions for musl-based Linux distributions on x64 platforms.

* Added socket options that are in the process of being stabilised.

* Upgraded bundled version of ZeroMQ to 4.2.5 on Linux and macOS. The bundled version on Windows is held back at 4.2.2 for now.
