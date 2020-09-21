# 规范 2.2.4 项测试不通过

> 2.2.4: `onFulfilled` or `onRejected` must not be called until the execution context stack contains only platform code.

### 错误日志

```javascript
 1) 2.2.4: `onFulfilled` or `onRejected` must not be called until the execution context stack contains only platform code. Clean-stack execution ordering tests (fulfillment case) when one `onFulfilled` is added inside another `onFulfilled`:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (E:\Promise-A-Plus\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (internal/timers.js:531:17)
      at processTimers (internal/timers.js:475:7)
```

根据错误日志，我们没有通过`2.2.4`项的测试用例。具体表现为：

```javascript
Clean-stack execution ordering tests (fulfillment case) when one `onFulfilled` is added inside another `onFulfilled`:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
```

### 测试用例代码

```javascript
describe('Clean-stack execution ordering tests (fulfillment case)', function () {
  specify(
    'when one `onFulfilled` is added inside another `onFulfilled`',
    function (done) {
      var promise = resolved();
      var firstOnFulfilledFinished = false;

      promise.then(function () {
        promise.then(function () {
          // 应该是这里报错了，导致done()未被调用
          assert.strictEqual(firstOnFulfilledFinished, true);
          done();
        });
        firstOnFulfilledFinished = true;
      });
    }
  );
});
```
