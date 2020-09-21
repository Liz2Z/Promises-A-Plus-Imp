# 规范 2.2.6 项测试不通过

> 2.2.6: `then` may be called multiple times on the same promise.
>
> > 2.2.6.1: If/when `promise` is fulfilled, all respective `onFulfilled` callbacks must execute in the order of their originating calls to `then`.

### 错误日志

```javascript
1) 2.2.6: `then` may be called multiple times on the same promise. 2.2.6.1: If/when `promise` is fulfilled, all respective `onFulfilled` callbacks must execute in the order of their originating calls to `then`. multiple boring fulfillment handlers already-fulfilled:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (E:\Promise-A-Plus\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (internal/timers.js:531:17)
      at processTimers (internal/timers.js:475:7)
```

### [测试用例代码](https://github.com/promises-aplus/promises-tests/blob/4786505fcb0cafabc5f5ce087e1df86358de2da6/lib/tests/2.2.6.js#L26)

```javascript
describe('multiple boring fulfillment handlers', function () {
  testFulfilled(sentinel, function (promise, done) {
    var handler1 = sinon.stub().returns(other);
    var handler2 = sinon.stub().returns(other);
    var handler3 = sinon.stub().returns(other);

    var spy = sinon.spy();
    promise.then(handler1, spy);
    promise.then(handler2, spy);
    promise.then(handler3, spy);

    promise.then(function (value) {
      assert.strictEqual(value, sentinel);

      sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
      sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
      sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
      sinon.assert.notCalled(spy);

      done();
    });
  });
});
```
