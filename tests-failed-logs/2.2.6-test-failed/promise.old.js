/* eslint-disable no-underscore-dangle */
const promiseSymbol = Symbol('promise');

const changeAccess = Symbol('changeAccess');

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

  // 如果 x 为 Promise ，则使 promise 接受 x 的状态
  if (x[promiseSymbol] === 'promise') {
    x.then(
      value => {
        promise._changeState(PromiseState.Fulfilled, value, changeAccess);
      },
      reason => {
        promise._changeState(PromiseState.Rejected, reason, changeAccess);
      }
    );
    return;
  }

  // x 为一个thenable的对象，即具有then属性
  // NOTE: 为了兼容符合Promise 规范的其他Promise实现
  if (typeof x === 'function' || (typeof x === 'object' && x !== null)) {
    let then;

    try {
      then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      promise._changeState(PromiseState.Rejected, error, changeAccess);
      return;
    }

    // .then属性指向的不是一个方法，则以 x为值 resolve promise
    if (typeof then !== 'function') {
      promise._changeState(PromiseState.Fulfilled, x, changeAccess);
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
      promise._changeState(PromiseState.Rejected, r, changeAccess);
    };

    try {
      then.call(x, _resolvePromise, rejectPromise);
    } catch (error) {
      if (exected) {
        return;
      }
      promise._changeState(PromiseState.Rejected, error, changeAccess);
    }
    return;
  }

  // x 不是函数也不是对象，以 x 为值，resolve promise
  promise._changeState(PromiseState.Fulfilled, x, changeAccess);
}

class Promise {
  thenCallbacks = [];

  state = PromiseState.Pending;

  value = undefined;

  reason = undefined;

  timer = undefined;

  constructor(callback) {
    const resolve = value => {
      this._changeState(PromiseState.Fulfilled, value, changeAccess);
    };

    const reject = reason => {
      this._changeState(PromiseState.Rejected, reason, changeAccess);
    };

    callback(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    const obj = {};

    // onFulfilled，onRejected不是函数，被忽略
    if (typeof onFulfilled === 'function') {
      obj.onFulfilled = onFulfilled;
    }

    if (typeof onRejected === 'function') {
      obj.onRejected = onRejected;
    }

    obj.returnPromise = new Promise(() => undefined);

    // 一个promise可以多次调用then方法
    // 所以需要一个队列来存储
    this.thenCallbacks.push(obj);

    // promise 已经确定了最终状态后，继续调用promise.then
    if (this.state !== PromiseState.Pending) {
      this._exec();
    }

    // then方法必须return 一个promise
    return obj.returnPromise;
  }

  _changeState(newState, value, access) {
    // 当 promise 为 fulfilled 或 rejected状态后，不允许promise再变为其他状态
    if (this.state !== PromiseState.Pending) {
      return;
    }
    //
    if (access !== changeAccess) {
      return;
    }

    switch (newState) {
      case PromiseState.Fulfilled: {
        this.value = value;
        break;
      }

      case PromiseState.Rejected: {
        this.reason = value;
        break;
      }

      default: {
        throw Error('');
      }
    }

    this.state = newState;

    this._exec();
  }

  _exec() {
    // onFulfilled 和 onRejected 只有在执行环境堆栈仅包含平台代码时才可被调用
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    const callbacks = this.thenCallbacks;
    this.thenCallbacks = [];

    // onFulfilled 和 onRejected 只有在执行环境堆栈仅包含平台代码时才可被调用
    this.timer = setTimeout(() => {
      callbacks.forEach(obj => {
        const { onRejected, onFulfilled, returnPromise } = obj;

        if (this.state === PromiseState.Fulfilled) {
          // 如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值
          if (!onFulfilled) {
            returnPromise._changeState(
              PromiseState.Fulfilled,
              this.value,
              changeAccess
            );
            return;
          }
        } else {
          // 如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因
          // eslint-disable-next-line no-lonely-if
          if (!onRejected) {
            returnPromise._changeState(
              PromiseState.Rejected,
              this.reason,
              changeAccess
            );
            return;
          }
        }

        try {
          if (this.state === PromiseState.Fulfilled) {
            const x = onFulfilled.call(undefined, this.value);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            resolvePromise(returnPromise, x);
          } else {
            const x = onRejected.call(undefined, this.reason);
            // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行 Promise 解决过程：[[Resolve]](promise2, x)
            resolvePromise(returnPromise, x);
          }
        } catch (err) {
          // 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
          returnPromise._changeState(
            PromiseState.Rejected,
            this.reason,
            changeAccess
          );
        }
      });
    }, 0);
  }
}

Object.defineProperty(Promise, promiseSymbol, {
  value: 'promise',
});

module.exports = Promise;
