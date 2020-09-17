const promiseSymbol = Symbol('promise');


class Promise {
    constructor(callback) {

        const changeState = (state, value) => {
            if (state !== 'Pending') {
                return;
            }
            this.promiseState = state;

            let immutableValue;
            const valueType = typeof value;
            if (
                ['undefined', 'string', 'boolean', 'number'].indexOf(valueType) > -1
                || value === null
            ) {
                immutableValue = value;
            } else {
                immutableValue = Object.freeze(value);
            }

            setTimeout(() => {
                this.thenQueue.forEach(obj => {
                    const {
                        onRejected,
                        onFulfilled,
                        returnPromise,
                        returnPromiseReject,
                        returnPromiseResolve,
                    } = obj;

                    if (state === 'Fulfilled') {
                        if (!onFulfilled) {
                            returnPromiseResolve(value);
                            return;
                        }
                    } else {
                        if (!onRejected) {
                            returnPromiseReject(value);
                            return;
                        }
                    }

                    try {
                        const fn = state === 'Fulfilled' ? onFulfilled : onRejected;
                        const x = fn.call(undefined, immutableValue);
                        resolvePromise(returnPromise, x);
                    } catch (err) {
                        returnPromiseReject(err);
                    }
                });
            }, 0);
        };

        const resolve = (value) => {
            changeState('Fulfilled', value);
        };

        const reject = (reason) => {
            changeState('Rejected', reason);
        };

        this.promiseState = 'Pending';

        this.thenQueue = [];

        callback(resolve, reject);
    }
    then(onFulfilled, onRejected) {
        const obj = {};

        /**
         * 如果onFulfilled，onRejected不是函数，被忽略
         */
        if (typeof onFulfilled === 'function') {
            obj.onFulfilled = onFulfilled;
        }
        if (typeof onRejected === 'function') {
            obj.onRejected = onRejected;
        }

        obj.returnPromise = new Promise((resolve, reject) => {
            obj.returnPromiseResolve = resolve;
            obj.returnPromiseReject = reject;
        });

        /**
         * 一个promise可以多次调用then方法
         * 所以需要一个队列来存储
         */
        this.thenQueue.push(obj);

        /**
         * then方法必须return 一个promise
         */
        return obj.returnPromise;
    }
}

Object.defineProperty(Promise, promiseSymbol, {
    value: 'promise',
});

/**
 * [[Resolve]](promise, x) Promise 解决过程
 * 
 */
function resolvePromise(promise, x) {
    /**
     * 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
     */
    if (promise === x) {
        throw TypeError('cannot exec promise, cause promise === x');
    }
    /**
     * x 为 Promise
     * 如果 x 为 Promise ，则使 promise 接受 x 的状态
     */
    if (x[promiseSymbol] === 'promise') {

    }
    if (typeof x === 'function' || typeof x === 'object') {

    }
}
