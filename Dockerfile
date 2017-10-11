FROM node:8.6

RUN apt-get update && apt-get install -y libzmq3-dev

ENV ZMQ_SHARED=true

WORKDIR /workdir
CMD yarn install && yarn test

# Run with:
# docker build . --tag zmq-test && docker run --tty --interactive --rm --volume $(PWD):/workdir zmq-test