
class Promise {
    constructor(callback) {
        let state = 'Pending';

        const resolve = (value) => {
            if (state !== 'Pending') {
                return;
            }
            state = 'Fulfilled';
            setTimeout(() => {
                this.onFulfilled && this.onFulfilled.call(undefined, value);
            }, 0);
        };

        const reject = (reason) => {
            if (state !== 'Pending') {
                return;
            }
            state = 'Rejected';


            let immutableReason;
            const reasonType = typeof reason;
            if (['undefined', 'string', 'boolean', 'number'].indexOf(reasonType) > -1 || reason === null) {
                immutableReason = reason;
            } else {
                immutableReason = Object.freeze(reason);
            }
            setTimeout(() => {
                this.onRejected && this.onRejected.call(undefined, immutableReason);
            }, 0);
        };

        callback(resolve, reject);
    }
    then(onFulfilled, onRejected) {
        if (typeof onFulfilled === 'function') {
            this.onFulfilled = onFulfilled();
        }
        if (typeof onRejected === 'function') {
            this.onRejected = onRejected();
        }
    }
    static resolve() {

    }

    static reject() {

    }
}
