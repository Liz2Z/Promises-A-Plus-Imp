/* eslint-disable no-underscore-dangle */

// NOTE: “value” is any legal JavaScript value (including undefined, a thenable, or a promise).
// NOTE: “reason” is a value that indicates why a promise was rejected.

// NOTE: A promise must be in one of three states: pending, fulfilled, or rejected.
const PromiseState = {
  Pending: 'pending',
  Fulfilled: 'fulfilled',
  Rejected: 'rejected',
};

class Promise {
  _state = PromiseState.Pending;

  _result = undefined;

  _thenRecords = [];

  constructor(callback) {
    const resolve = value => {
      this._transition(PromiseState.Fulfilled, value);
    };

    const reject = reason => {
      this._transition(PromiseState.Rejected, reason);
    };

    callback(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    const record = {
      onFulfilled,
      onRejected,
      returnPromise: new Promise(() => undefined),
    };

    // 2.2.6 then may be called multiple times on the same promise.
    // TIP: 当promise长期处于pending状态时，需要一个数组来存储then Record
    this._thenRecords.push(record);

    // 2.2.6.1 If promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
    // 2.2.6.2 If promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
    if (this._state !== PromiseState.Pending) {
      this._exec();
    }

    // 2.2.7 then must return a promise
    return record.returnPromise;
  }

  _transition(newState, value) {
    // 2.1.2 When fulfilled, a promise:
    //     2.1.2.1 must not transition to any other state.
    // 2.1.3 When rejected, a promise:
    //     2.1.3.1 must not transition to any other state.
    if (this._state !== PromiseState.Pending) {
      return;
    }

    // 2.1.1 When pending, a promise:
    //     2.1.1.1 may transition to either the fulfilled or rejected state.
    if (
      newState !== PromiseState.Fulfilled &&
      newState !== PromiseState.Rejected
    ) {
      return;
    }

    this._state = newState;

    // 2.1.2 When fulfilled, a promise:
    //     2.1.2.2 must have a value, which must not change.
    // 2.1.3 When rejected, a promise:
    //     2.1.3.2 must have a reason, which must not change.
    this._result = value;

    // 2.2.6.1 when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
    // 2.2.6.2 when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
    this._exec();
  }

  _exec() {
    const { _thenRecords } = this;
    this._thenRecords = [];

    // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
    setTimeout(() => {
      // 2.2.6 then may be called multiple times on the same promise.
      // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
      // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
      _thenRecords.forEach(({ onFulfilled, onRejected, returnPromise }) => {
        // 2.2.1.1 If onFulfilled is not a function, it must be ignored.
        // 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1.
        if (
          this._state === PromiseState.Fulfilled &&
          typeof onFulfilled !== 'function'
        ) {
          returnPromise._transition(PromiseState.Fulfilled, this._result);
          return;
        }

        // 2.2.1.2 If onRejected is not a function, it must be ignored.
        // 2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1.
        if (
          this._state === PromiseState.Rejected &&
          typeof onRejected !== 'function'
        ) {
          returnPromise._transition(PromiseState.Rejected, this._result);
          return;
        }

        try {
          if (this._state === PromiseState.Fulfilled) {
            const x = onFulfilled.call(undefined, this._result);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            Promise.resolvePromise(returnPromise, x);
          } else if (this._state === PromiseState.Rejected) {
            const x = onRejected.call(undefined, this._result);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            Promise.resolvePromise(returnPromise, x);
          }
        } catch (error) {
          // 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
          returnPromise._transition(PromiseState.Rejected, error);
        }
      });
    }, 0);
  }

  /**
   * [[Resolve]](promise, x) Promise 解决过程
   */
  static resolvePromise(promise, x) {
    // 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (promise === x) {
      throw TypeError('cannot resolve promise, cause promise === x');
    }

    // 2.3.2 If x is a promise, adopt its state
    if (x instanceof Promise) {
      // 2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected.
      // 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.
      // 2.3.2.3 If/when x is rejected, reject promise with the same reason.
      x.then(
        value => {
          // TODO: 🧐💢💥💫💦💦💤💤💫✨🎉🤷🤷
          // ❌ 按照规范： 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.
          // ❌ 这里应该：promise._transition(PromiseState.Fulfilled, value);
          // ❌ 但是没法通过测试用例
          Promise.resolvePromise(promise, value);
          // promise._transition(PromiseState.Fulfilled, value);
        },
        reason => {
          promise._transition(PromiseState.Rejected, reason);
        }
      );
      return;
    }

    // NOTE: 为了兼容符合Promise 规范的其他Promise实现
    // NOTE: “thenable” is an object or function that defines a then method.
    //
    // 2.3.3 Otherwise, if x is an object or function, （x 为 “thenable” 时，）
    if (typeof x === 'function' || (typeof x === 'object' && x !== null)) {
      let then;

      try {
        // 2.3.3.1 Let then be x.then.
        then = x.then;
      } catch (error) {
        // 2.3.3.2 If retrieving the property x.then results in a thrown exception e,
        //  reject promise with e as the reason.
        promise._transition(PromiseState.Rejected, error);
        return;
      }

      // 2.3.3.4 If `then` is not a function, fulfill `promise` with `x`.
      if (typeof then !== 'function') {
        promise._transition(PromiseState.Fulfilled, x);
        return;
      }

      let exected = false;

      const resolvePromise = y => {
        if (exected) {
          return;
        }
        exected = true;
        Promise.resolvePromise(promise, y);
      };

      const rejectPromise = r => {
        if (exected) {
          return;
        }
        exected = true;
        promise._transition(PromiseState.Rejected, r);
      };

      try {
        // 2.3.3.3 If then is a function, call it with x as this,
        // first argument resolvePromise, and second argument rejectPromise,
        then.call(x, resolvePromise, rejectPromise);
      } catch (error) {
        if (exected) {
          return;
        }
        exected = true;
        promise._transition(PromiseState.Rejected, error);
      }
      return;
    }

    // 2.3.4 If x is not an object or function, fulfill promise with x.
    promise._transition(PromiseState.Fulfilled, x);
  }
}

module.exports = Promise;
