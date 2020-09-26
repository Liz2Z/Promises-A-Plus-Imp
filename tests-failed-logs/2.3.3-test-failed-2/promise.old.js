/* eslint-disable no-underscore-dangle */

// NOTE: A promise must be in one of three states: pending, fulfilled, or rejected.
const PromiseState = {
  Pending: 'pending',
  Fulfilled: 'fulfilled',
  Rejected: 'rejected',
};

class Promise {
  _thenRecords = [];

  _state = PromiseState.Pending;

  // NOTE: “value” is any legal JavaScript value (including undefined, a thenable, or a promise).
  _value = undefined;

  // NOTE: “reason” is a value that indicates why a promise was rejected.
  _reason = undefined;

  constructor(callback) {
    const resolve = value => {
      this._changeState(PromiseState.Fulfilled, value);
    };

    const reject = reason => {
      this._changeState(PromiseState.Rejected, reason);
    };

    callback(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    const record = {};

    // 2.2.1 Both onFulfilled and onRejected are optional arguments:
    //     2.2.1.1 If onFulfilled is not a function, it must be ignored.
    if (typeof onFulfilled === 'function') {
      record.onFulfilled = onFulfilled;
    }
    //     2.2.1.2 If onRejected is not a function, it must be ignored.
    if (typeof onRejected === 'function') {
      record.onRejected = onRejected;
    }

    // 2.2.7 then must return a promise
    record.returnPromise = new Promise(() => undefined);

    // 2.2.6 then may be called multiple times on the same promise.
    // TIP: 当promise长期处于pending状态时，需要一个数组来存储then Record
    this._thenRecords.push(record);

    // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
    // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
    if (this._state !== PromiseState.Pending) {
      this._exec();
    }

    // 2.2.7 then must return a promise
    return record.returnPromise;
  }

  _changeState(newState, value) {
    // 2.1.1 When pending, a promise:
    //     2.1.1.1 may transition to either the fulfilled or rejected state.
    if (this._state === PromiseState.Pending) {
      this._state = newState;
    } else {
      // 2.1.2 When fulfilled, a promise:
      //     2.1.2.1 must not transition to any other state.
      // 2.1.3 When rejected, a promise:
      //     2.1.3.1 must not transition to any other state.
      return;
    }

    // 2.1.2 When fulfilled, a promise:
    //     2.1.2.2 must have a value, which must not change.
    if (newState === PromiseState.Fulfilled) {
      this._value = value;
    } else if (newState === PromiseState.Rejected) {
      // 2.1.3 When rejected, a promise:
      //     2.1.3.2 must have a reason, which must not change.
      this._reason = value;
    } else {
      throw Error('');
    }

    // 2.2.6.1 If/when promise is fulfilled, all respective onFulfilled callbacks must execute in the order of their originating calls to then.
    // 2.2.6.2 If/when promise is rejected, all respective onRejected callbacks must execute in the order of their originating calls to then.
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
      _thenRecords.forEach(({ onRejected, onFulfilled, returnPromise }) => {
        if (this._state === PromiseState.Fulfilled) {
          // 如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值
          if (!onFulfilled) {
            returnPromise._changeState(PromiseState.Fulfilled, this._value);
            return;
          }
        } else {
          // 如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因
          // eslint-disable-next-line no-lonely-if
          if (!onRejected) {
            returnPromise._changeState(PromiseState.Rejected, this._reason);
            return;
          }
        }

        try {
          if (this._state === PromiseState.Fulfilled) {
            const x = onFulfilled.call(undefined, this._value);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            Promise.resolvePromise(returnPromise, x);
          } else {
            const x = onRejected.call(undefined, this._reason);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            Promise.resolvePromise(returnPromise, x);
          }
        } catch (error) {
          // 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
          returnPromise._changeState(PromiseState.Rejected, error);
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
          // 💘：❌❌❌❌❌❌
          // 这是错误的写法
          promise._changeState(PromiseState.Fulfilled, value);
          // 💘：❌❌❌❌❌❌

          // 🚀： ✅✅✅✅✅✅
          // Promise.resolvePromise(promise, value);
          // 🚀： ✅✅✅✅✅✅
        },
        reason => {
          promise._changeState(PromiseState.Rejected, reason);
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
        promise._changeState(PromiseState.Rejected, error);
        return;
      }

      // 2.3.3.4 If `then` is not a function, fulfill `promise` with `x`.
      if (typeof then !== 'function') {
        promise._changeState(PromiseState.Fulfilled, x);
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
        promise._changeState(PromiseState.Rejected, r);
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
        promise._changeState(PromiseState.Rejected, error);
      }
      return;
    }

    // 2.3.4 If x is not an object or function, fulfill promise with x.
    promise._changeState(PromiseState.Fulfilled, x);
  }
}

module.exports = Promise;
