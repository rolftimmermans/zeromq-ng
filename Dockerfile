FROM node:8.6

RUN apt-get update && apt-get install -y libzmq3-dev

WORKDIR /workdir
CMD yarn test

# Run with:
# docker build . --tag zmq-test && docker run --tty --interactive --rm --volume $(PWD):/workdir zmq-test