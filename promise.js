/* eslint-disable no-underscore-dangle */
const promiseSymbol = Symbol('promise');

// const changeAccess = Symbol('changeAccess');

const PromiseState = {
  Pending: 'Pending',
  Fulfilled: 'Fulfilled',
  Rejected: 'Rejected',
};

/**
 * [[Resolve]](promise, x) Promise 解决过程
 */
function resolvePromise(promise, x) {
  // promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
  if (promise === x) {
    throw TypeError('cannot resolve promise, cause promise === x');
  }

  // 如果 x 为 Promise ，使 promise 接受 x 的状态
  if (x[promiseSymbol] === 'promise') {
    x.then(
      value => {
        promise._changeState(PromiseState.Fulfilled, value);
      },
      reason => {
        promise._changeState(PromiseState.Rejected, reason);
      }
    );
    return;
  }

  // “thenable” is an object or function that defines a then method.
  // x 为 “thenable” 时，
  // NOTE: 为了兼容符合Promise 规范的其他Promise实现
  if (typeof x === 'function' || (typeof x === 'object' && x !== null)) {
    let then;

    try {
      then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      promise._changeState(PromiseState.Rejected, error);
      return;
    }

    // .then属性指向的不是一个方法，则以 x为值 resolve promise
    if (typeof then !== 'function') {
      promise._changeState(PromiseState.Fulfilled, x);
      return;
    }

    let exected = false;

    const _resolvePromise = y => {
      if (exected) {
        return;
      }
      exected = true;
      resolvePromise(promise, y);
    };

    const rejectPromise = r => {
      if (exected) {
        return;
      }
      exected = true;
      promise._changeState(PromiseState.Rejected, r);
    };

    try {
      then.call(x, _resolvePromise, rejectPromise);
    } catch (error) {
      if (exected) {
        return;
      }
      promise._changeState(PromiseState.Rejected, error);
    }
    return;
  }

  // x 不是函数也不是对象，以 x 为值，resolve promise
  promise._changeState(PromiseState.Fulfilled, x);
}

class Promise {
  _thenRecords = [];

  _state = PromiseState.Pending;

  _value = undefined;

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

    // onFulfilled，onRejected不是函数，被忽略
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
    // 当promise长期处于pending状态时，需要一个数组来存储then Record
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
            resolvePromise(returnPromise, x);
          } else {
            const x = onRejected.call(undefined, this._reason);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            resolvePromise(returnPromise, x);
          }
        } catch (error) {
          // 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
          returnPromise._changeState(PromiseState.Rejected, error);
        }
      });
    }, 0);
  }
}

Object.defineProperty(Promise, promiseSymbol, {
  value: 'promise',
});

module.exports = Promise;
