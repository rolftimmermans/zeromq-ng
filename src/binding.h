/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include <napi.h>

#include <zmq.h>
#if ZMQ_VERSION < ZMQ_MAKE_VERSION(4,1,0)
#   include <zmq_utils.h>
#endif

#include <node.h>
#include <cassert>

#include "inline/arguments.h"
#include "inline/error.h"
#include "inline/util.h"

#ifdef __MSVC__
#define force_inline inline __forceinline
#else
#define force_inline inline __attribute__((always_inline))
#endif
