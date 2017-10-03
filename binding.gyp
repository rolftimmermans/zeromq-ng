{
  'variables': {
    'zmq_external%': 'true',
  },
  'targets': [
    {
      'target_name': 'zeromq',
      'sources': [
        'src/binding.cc',
        'src/context.cc',
        'src/socket.cc',
      ],

      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],

      'conditions': [
        ['OS != "win"', {
          'cflags_cc+': [
            '-std=c++14',
            '-flto',
            '-Wall', '-Wextra', '-Wpedantic',
            '-Wno-unused-parameter', '-Wno-gnu-zero-variadic-macro-arguments'
          ],
        }],

        ['OS == "mac"', {
          'xcode_settings': {
            'LLVM_LTO': 'YES',
            'CLANG_CXX_LIBRARY': 'libc++',
            'MACOSX_DEPLOYMENT_TARGET': '10.9',
            'OTHER_CPLUSPLUSFLAGS': [
              '-std=c++14',
              '-flto',
              '-Wall', '-Wextra', '-Wpedantic',
              '-Wno-unused-parameter', '-Wno-gnu-zero-variadic-macro-arguments'
            ],
          },
        }],

        ["zmq_external == 'true'", {
          'link_settings': {
            'libraries': ['-lzmq'],
          },
        }, {
          'conditions': [
            ['OS == "win"', {
              'msbuild_toolset': 'v140',
              'defines': ['ZMQ_STATIC'],
              'include_dirs': ['windows/include'],
              'libraries': [
                '<(PRODUCT_DIR)/../../windows/lib/libzmq',
                'ws2_32.lib',
                'iphlpapi',
              ],
            }],

            ['OS == "mac"', {
              'xcode_settings': {},
              'libraries': ['<(PRODUCT_DIR)/../../zmq/lib/libzmq.a'],
              'include_dirs': ['<(PRODUCT_DIR)/../../zmq/include'],
            }],

            ['OS != "win" and OS != "mac"', {
              'libraries': ['<(PRODUCT_DIR)/../../zmq/lib/libzmq.a'],
              'include_dirs': ['<(PRODUCT_DIR)/../../zmq/include'],
            }],
          ],
        }],
      ],
    }
  ]
}
