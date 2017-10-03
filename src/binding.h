/* Copyright (c) 2017 Rolf Timmermans */
#pragma once

#include <napi.h>
#include <zmq.h>
#include <node.h>
#include <cassert>
#include <iostream>

#include "inline/arguments.h"
#include "inline/error.h"
#include "inline/util.h"

#ifdef __MSVC__
#define force_inline inline __forceinline
#else
#define force_inline inline __attribute__((always_inline))
#endif
