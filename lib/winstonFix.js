'use strict';

// A workaround for a bug in winston:
// See: https://github.com/flatiron/winston/issues/280

module.exports = exports = {};

exports.fix = function () {
    var winstonCommon = require('winston/lib/winston/common'),
        _log = winstonCommon.log;

    function errorToStack(obj) {
        var copy;

        if (obj === null || typeof obj !== 'object') {
          return obj;
        }

        if (obj instanceof Error) {
          return obj.stack;
        }

        if (obj instanceof Date || obj instanceof RegExp) {
          return obj;
        }

        if (obj instanceof Array) {
          copy = [];
          for (var i in obj) {
            copy[i] = errorToStack(obj[i]);
          }
          return copy;
        }
        else {
          copy = {};
          for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
              copy[k] = errorToStack(obj[k]);
            }
          }
          return copy;
        }
      }

    winstonCommon.log = function (options) {
      if (options !== null && typeof options === 'object' && typeof options.meta === 'object') {
        options.meta = errorToStack(options.meta);
      }
      return _log(options);
    };
  };