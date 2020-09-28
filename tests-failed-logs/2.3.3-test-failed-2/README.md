# 规范 2.3.3 项测试不通过

> 2.3.3: Otherwise, if `x` is an object or function,
>
> > 2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and second argument `rejectPromise`, where:
> >
> > > 2.3.3.3.1: If/when `resolvePromise` is called with value `y`, run `[[Resolve]](promise, y)`

### 错误日志

```javascript
  1) 2.3.3: Otherwise, if `x` is an object or function,
  2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and second argument `rejectPromise`
  2.3.3.3.1: If/when `resolvePromise` is called with value `y`, run `[[Resolve]](promise, y)`
  `y` is a thenable for a thenable
  `y` is an already-fulfilled promise for a synchronously-fulfilled custom thenable `then` calls `resolvePromise` synchronously via return from a
fulfilled promise:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\Code\Git\Promise-A-Plus\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (internal/timers.js:549:17)
      at processTimers (internal/timers.js:492:7)
```

### [测试用例代码](https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L319)

```javascript
'use strict';

var adapter = global.adapter;
var resolved = adapter.resolved;
var rejected = adapter.rejected;
var deferred = adapter.deferred;

var other = { other: 'other' }; // a value we don't want to be strict equal to

exports.fulfilled = {
  'a synchronously-fulfilled custom thenable': function (value) {
    return {
      then: function (onFulfilled) {
        onFulfilled(value);
      },
    };
  },

  'an already-fulfilled promise': function (value) {
    return resolved(value);
  },
};
```

```javascript
'use strict';

var assert = require('assert');
var thenables = require('./helpers/thenables');
var reasons = require('./helpers/reasons');

var adapter = global.adapter;
var resolved = adapter.resolved;
var rejected = adapter.rejected;
var deferred = adapter.deferred;

var dummy = { dummy: 'dummy' }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: 'sentinel' }; // a sentinel fulfillment value to test for with strict equality
var other = { other: 'other' }; // a value we don't want to be strict equal to
var sentinelArray = [sentinel]; // a sentinel fulfillment value to test when we need an array

function testPromiseResolution(xFactory, test) {
  specify('via return from a fulfilled promise', function (done) {
    var promise = resolved(dummy).then(function onBasePromiseFulfilled() {
      return xFactory();
    });

    test(promise, done);
  });
}

function testCallingResolvePromise(yFactory, stringRepresentation, test) {
  describe('`y` is ' + stringRepresentation, function () {
    describe('`then` calls `resolvePromise` synchronously', function () {
      function xFactory() {
        return {
          then: function (resolvePromise) {
            // yFactory() === promise that is resolved with :
            // {
            //    then: function (onFulfilled) {
            //      onFulfilled(sentinel);
            //    },
            //  }
            resolvePromise(yFactory());
          },
        };
      }

      testPromiseResolution(xFactory, test);
    });
  });
}

function testCallingResolvePromiseFulfillsWith(
  yFactory,
  stringRepresentation,
  fulfillmentValue
) {
  testCallingResolvePromise(yFactory, stringRepresentation, function (
    promise,
    done
  ) {
    promise.then(function onPromiseFulfilled(value) {
      assert.strictEqual(value, fulfillmentValue);
      done();
    });
  });
}

describe('2.3.3: Otherwise, if `x` is an object or function,', function () {
  describe(
    '2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and ' +
      'second argument `rejectPromise`',
    function () {
      describe('2.3.3.3.1: If/when `resolvePromise` is called with value `y`, run `[[Resolve]](promise, y)`', function () {
        describe('`y` is a thenable for a thenable', function () {
          Object.keys(thenables.fulfilled).forEach(function (
            outerStringRepresentation
          ) {
            var outerThenableFactory =
              thenables.fulfilled[outerStringRepresentation];

            Object.keys(thenables.fulfilled).forEach(function (
              innerStringRepresentation
            ) {
              var innerThenableFactory =
                thenables.fulfilled[innerStringRepresentation];

              var stringRepresentation =
                outerStringRepresentation + ' for ' + innerStringRepresentation;

              function yFactory() {
                // innerThenableFactory(sentinel)
                //        👇👇👇
                // {
                //   then: function (onFulfilled) {
                //     onFulfilled(sentinel);
                //   },
                // }
                //
                // outerThenableFactory(innerThenableFactory(sentinel))
                //        👇👇👇
                // resolved(innerThenableFactory(sentinel))
                //        👇👇👇
                // promise that is resolved with `innerThenableFactory(sentinel)`
                return outerThenableFactory(innerThenableFactory(sentinel));
              }

              testCallingResolvePromiseFulfillsWith(
                yFactory,
                stringRepresentation,
                sentinel
              );
            });
          });
        });
      });
    }
  );
});
```
