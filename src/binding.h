/* Copyright (c) 2017-2018 Rolf Timmermans */
#pragma once

#include <napi.h>

#include <zmq.h>
#if ZMQ_VERSION < ZMQ_MAKE_VERSION(4, 1, 0)
#include <zmq_utils.h>
#endif

#include <cassert>

#include <iostream>

#include "util/arguments.h"
#include "util/error.h"
#include "util/object.h"
#include "util/to_string.h"

#ifdef _MSC_VER
#define force_inline inline __forceinline
#else
#define force_inline inline __attribute__((always_inline))
#endif

#ifdef _MSC_VER
#pragma warning(disable : 4146)
#ifndef _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES
#define _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES 1
#endif
#endif

/* Fix errors with numeric_limits<T>::max. */
#ifdef max
#undef max
#endif

#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4, 0, 5)
#define ZMQ_HAS_STEERABLE_PROXY 1
#endif
