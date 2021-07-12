/**
 * Created by Julian on 30.04.2017.
 * Modified for Dyno by Brian Tanner on 05.05.2017
 */
const Stream = require('stream');
const https = require('https');
const http = require('http');
const URL = require('url');
const logger = Loader.require('./core/logger');

class WolkeStream {
    constructor(url, options) {
        options = options || {};
        this.output = new Stream.PassThrough({ highWaterMark: options.highWaterMark || null });
        this.total = 0;
        this.done = 0;
        this.url = url;
        this.request(url, 0);
        return this.output;
    }

    request(url, length) {
        const options = typeof url === 'string' ? URL.parse(url) : url;
        if (!options.headers) options.headers = {};
        if (length > 0) {
            options.headers.Range = `bytes=${length}-`;
        }
        if (options.protocol === 'https:') {
            let req = https.get(options, (res) => {
                this.processRes(req, res);
            });
        } else {
            let req = http.get(options, (res) => {
                this.processRes(req, res);
            });
        }
    }

    _destroy(req, res) {
        res.unpipe();
        res.removeAllListeners();
        req.removeAllListeners();
    }

    processRes(req, res) {
        if (this.done === 0) this.total = Number(res.headers['content-length']);
        req.on('error', (err) => {
            if (!err) return;
            if (err.message === 'read ECONNRESET') {
                logger.warn(err.message, { type: 'WolkeStream.processRes' });
                this.output.pause();
                this._destroy(req, res);
                return this.request(this.url, this.done);
            }
            logger.error(err);
        });
        res.on('data', (chunk) => {
            // if (!chunk) {
            //     if (this.done === this.total) {
            //         return this.output.write(null);
            //     }
            // }
            this.done += Buffer.byteLength(chunk);
            // this.output.write(chunk);
        });
        res.on('aborted', (err) => {
            if (!err) return;
            logger.error(err);
            this.output.pause();
            this._destroy(req, res);
            return this.request(this.url, this.done);
        });
        res.on('error', (err) => {
            if (!err) return;
            logger.error(err);
            if (err.message === 'read ECONNRESET') {
                this.output.pause();
                this._destroy(req, res);
                return this.request(this.url, this.done);
            }
        });
        res.on('end', () => {
            if (this.done < this.total) {
                this._destroy(req, res);
                return this.request(this.url, this.done);
            } else {
				this._destroy(req, res);
                this.output.end();
            }
        });
        res.pipe(this.output, { end: false });
    }
}

module.exports = WolkeStream;
