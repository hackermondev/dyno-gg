const EventEmitter = require("events")
class Queue extends EventEmitter {
    constructor(options) {
        super()
        this._queue = [];
        this.interval = options.interval
        this.reqPerInterval = options.reqPerInterval
        this.service = options.service

        this.start();
    }

    start() {
        let self = this
        setInterval(function () {
            if (self._queue.length > 0) {
                self.processQueue();
            }
        }, self.interval);
    }

    queue(request) {
        this._queue.push(request);
    }

    processQueue() {
        let requestCount = this.reqPerInterval;
        while (requestCount > 0) {
            let req = this._queue[0];
            if (!req) return;
            this.emit("process", { request: req, service: this.service });
            this._queue.splice(0, 1);
            requestCount -= 1;
        }
    }
}

module.exports = Queue;
