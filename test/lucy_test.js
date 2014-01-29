'use strict';

var lucy = require('../lib/lucy.js');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.lucy = {
  setUp: function (done) {
    // setup here
    done();

  },
  'mapCollection': function (test) {
    test.expect(1);
    // tests here
    test.equal(lucy.mapCollection('test'), lucy, 'mapCollection should return lucy for chaining.');

    test.done();
  },

  'asPromise - success': function (test) {

    var objx = {
      testfn: function (arg1, arg2, callback) {
        console.log('testfn called! arguments: ' + JSON.stringify(arguments));
        callback(null, (arg1 + arg2));
      }
    };

    test.expect(1);

    lucy.asPromise(objx, 'testfn');

    objx.testfn(1, 1).then(function (total) {

      test.equal(total, 2, 'promise result is what is returned by the async callback.');

      test.done();

    });
  },

  'asPromise - error': function (test) {

    var errorObj = new Error('async exception');

    var objx = {
      testfnError: function (arg1, arg2, callback) {
        callback(errorObj);
      }
    };

    test.expect(1);

    lucy.asPromise(objx, 'testfnError');

    objx.testfnError(1, 1).then(function () {

      test.ok(false, 'should not be called!');
      test.done();

    },
    function (error) {

      test.equal(error, errorObj, 'correct error obj');

      test.done();
    });
  }

};
