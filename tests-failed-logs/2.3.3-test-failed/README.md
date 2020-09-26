# 规范 2.3.3 项测试不通过

> 2.3.3: Otherwise, if x is an object or function,
>
> > 2.3.3.1: Let then be x.then.

### 错误日志

```javascript
 1) 2.3.3: Otherwise, if `x` is an object or function,
 2.3.3.1: Let `then` be `x.then`
 `x` is an object with null prototype 
 via return from a fulfilled promise:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\Code\Git\Promise-A-Plus\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (internal/timers.js:549:17)
      at processTimers (internal/timers.js:492:7)
```

### [测试用例代码](https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.3.3.js#L124)

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

describe('`x` is an object with null prototype', function () {
  var numberOfTimesThenWasRetrieved = null;

  beforeEach(function () {
    numberOfTimesThenWasRetrieved = 0;
  });

  function xFactory() {
    return Object.create(null, {
      then: {
        get: function () {
          ++numberOfTimesThenWasRetrieved;
          return function thenMethodForX(onFulfilled) {
            onFulfilled();
          };
        },
      },
    });
  }

  testPromiseResolution(xFactory, function (promise, done) {
    promise.then(function () {
      assert.strictEqual(numberOfTimesThenWasRetrieved, 1);
      done();
    });
  });
});
```
