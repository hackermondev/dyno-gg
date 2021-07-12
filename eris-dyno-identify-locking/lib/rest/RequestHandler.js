"use strict";

const DiscordHTTPError = require("../errors/DiscordHTTPError");
const DiscordRESTError = require("../errors/DiscordRESTError");
const Endpoints = require("./Endpoints");
const HTTPS = require("https");
const MultipartData = require("../util/MultipartData");
const SequentialBucket = require("../util/SequentialBucket");
const Zlib = require("zlib");

/**
* Handles API requests
*/
class RequestHandler {
    constructor(client, forceQueueing) {
        this._client = client;
        this.baseURL = Endpoints.BASE_URL;
        this.userAgent = `DiscordBot (https://github.com/abalabahaha/eris, ${require("../../package.json").version})`;
        this.ratelimits = {};
        this.latencyRef = {
            latency: 500,
            offset: client.options.ratelimiterOffset,
            raw: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
            timeOffset: 0,
            timeOffsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            lastTimeOffsetCheck: 0
        };
        this.globalBlock = false;
        this.readyQueue = [];
        if(forceQueueing) {
            this.globalBlock = true;
            this._client.once("shardPreReady", () => this.globalUnblock());
        }
    }

    globalUnblock() {
        this.globalBlock = false;
        while(this.readyQueue.length > 0) {
            this.readyQueue.shift()();
        }
    }

    routefy(url, method) {
        var route = url.replace(/\/([a-z-]+)\/(?:[0-9]{17,19})/g, function(match, p) {
            return p === "channels" || p === "guilds" || p === "webhooks" ? match : `/${p}/:id`;
        }).replace(/\/reactions\/[^/]+/g, "/reactions/:id").replace(/^\/webhooks\/(\d+)\/[A-Za-z0-9-_]{64,}/, "/webhooks/$1/:token");
        if(method === "DELETE" && route.endsWith("/messages/:id")) { // Delete Messsage endpoint has its own ratelimit
            route = method + route;
        }
        if(~route.indexOf("/reactions/:id")) { // PUT/DELETE one/all reactions is shared across the entire account
            route = "/channels/:id/messages/:id/reactions";
        }
        return route;
    }

    /**
    * Make an API request
    * @arg {String} method Uppercase HTTP method
    * @arg {String} url URL of the endpoint
    * @arg {Boolean} auth Whether to add the Authorization header and token or not
    * @arg {Object} [body] Request payload
    * @arg {Object} [file] File object
    * @arg {String} file.file A buffer containing file data
    * @arg {String} file.name What to name the file
    * @returns {Promise<Object>} Resolves with the returned JSON data
    */
    request(method, url, auth, body, file, _route, short) {
        var route = _route || this.routefy(url, method);

        var _stackHolder = {}; // Preserve async stack
        Error.captureStackTrace(_stackHolder);

        return new Promise((resolve, reject) => {
            var attempts = 0;

            var actualCall = (cb) => {
                var headers = {
                    "User-Agent": this.userAgent,
                    "Accept-Encoding": "gzip,deflate"
                };
                var data;

                try {
                    if(auth) {
                        headers.Authorization = this._client.token;
                    }
                    if(body && body.reason) { // Audit log reason sniping
                        if(body.reason === decodeURI(body.reason)) {
                            body.reason = encodeURIComponent(body.reason);
                        }
                        headers["X-Audit-Log-Reason"] = body.reason;
                        delete body.reason;
                    }
                    if(body && body.queryReason) {
                        body.reason = body.queryReason;
                        delete body.queryReason;
                    }
                    var finalURL = url;
                    if(file) {
                        if(Array.isArray(file)) {
                            data = new MultipartData();
                            headers["Content-Type"] = "multipart/form-data; boundary=" + data.boundary;
                            file.forEach(function(f) {
                                if(!f.file) {
                                    return;
                                }
                                data.attach(f.name, f.file, f.name);
                            });
                            if(body) {
                                data.attach("payload_json", body);
                            }
                            data = data.finish();
                        } else if(file.file) {
                            data = new MultipartData();
                            headers["Content-Type"] = "multipart/form-data; boundary=" + data.boundary;
                            data.attach("file", file.file, file.name);
                            if(body) {
                                data.attach("payload_json", body);
                            }
                            data = data.finish();
                        } else {
                            throw new Error("Invalid file object");
                        }
                    } else if(body) {
                        if(method === "GET" || (method === "PUT" && url.includes("/bans/")) || (method === "POST" && url.includes("/prune"))) { // Special PUT&POST case (╯°□°）╯︵ ┻━┻
                            var qs = "";
                            Object.keys(body).forEach(function(key) {
                                if(body[key] != undefined) {
                                     if(Array.isArray(body[key])) {
                                        body[key].forEach(function(val) {
                                            qs += `&${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
                                        });
                                    } else {
                                        qs += `&${encodeURIComponent(key)}=${encodeURIComponent(body[key])}`;
                                    }
                                }
                            });
                            finalURL += "?" + qs.substring(1);
                        } else {
                            data = JSON.stringify(body);
                            headers["Content-Type"] = "application/json";
                        }
                    }
                } catch(err) {
                    cb();
                    reject(err);
                    return;
                }

                var req = HTTPS.request({
                    method: method,
                    host: "discordapp.com",
                    path: this.baseURL + finalURL,
                    headers: headers
                });

                var reqError;

                req.once("abort", () => {
                    cb();
                    reqError = reqError || new Error(`Request aborted by client on ${method} ${url}`);
                    reqError.req = req;
                    reject(reqError);
                }).once("aborted", () => {
                    cb();
                    reqError = reqError || new Error(`Request aborted by server on ${method} ${url}`);
                    reqError.req = req;
                    reject(reqError);
                }).once("error", (err) => {
                    reqError = err;
                    req.abort();
                });

                var latency = Date.now();

                req.once("response", (resp) => {
                    latency = Date.now() - latency;
                    this.latencyRef.raw.push(latency);
                    this.latencyRef.latency = this.latencyRef.latency - ~~(this.latencyRef.raw.shift() / 10) + ~~(latency / 10);

                    var headerNow = Date.parse(resp.headers["date"]);
                    if(this.latencyRef.lastTimeOffsetCheck < Date.now() - 5000) {
                        var timeOffset = ~~((this.latencyRef.lastTimeOffsetCheck = Date.now()) - headerNow);
                        if(this.latencyRef.timeOffset - this.latencyRef.latency >= this._client.options.latencyThreshold && timeOffset - this.latencyRef.latency >= this._client.options.latencyThreshold) {
                            this._client.emit("warn", new Error(`Your clock is ${this.latencyRef.timeOffset}ms behind Discord's server clock. Please check your connection and system time.`));
                        }
                        this.latencyRef.timeOffset = ~~(this.latencyRef.timeOffset - this.latencyRef.timeOffsets.shift() / 10 + timeOffset / 10);
                        this.latencyRef.timeOffsets.push(timeOffset);
                    }

                    var response = "";

                    var _respStream = resp;
                    if(resp.headers["content-encoding"]) {
                        if(~resp.headers["content-encoding"].indexOf("gzip")) {
                            _respStream = resp.pipe(Zlib.createGunzip());
                        } else if(~resp.headers["content-encoding"].indexOf("deflate")) {
                            _respStream = resp.pipe(Zlib.createInflate());
                        }
                    }

                    _respStream.on("data", (str) => {
                        response += str;
                    }).once("end", () => {
                        var now = Date.now();

                        if(resp.headers["x-ratelimit-limit"]) {
                            this.ratelimits[route].limit = +resp.headers["x-ratelimit-limit"];
                        }

                        if(method !== "GET" && (resp.headers["x-ratelimit-remaining"] == undefined || resp.headers["x-ratelimit-limit"] == undefined) && this.ratelimits[route].limit !== 1) {
                            this._client.emit("debug", `Missing ratelimit headers for SequentialBucket(${this.ratelimits[route].remaining}/${this.ratelimits[route].limit}) with non-default limit\n`
                                + `${resp.statusCode} ${resp.headers["content-type"]}: ${method} ${route} | ${resp.headers["cf-ray"]}\n`
                                + "content-type = " +  + "\n"
                                + "x-ratelimit-remaining = " + resp.headers["x-ratelimit-remaining"] + "\n"
                                + "x-ratelimit-limit = " + resp.headers["x-ratelimit-limit"] + "\n"
                                + "x-ratelimit-reset = " + resp.headers["x-ratelimit-reset"] + "\n"
                                + "x-ratelimit-global = " + resp.headers["x-ratelimit-global"]);
                        }

                        this.ratelimits[route].remaining = resp.headers["x-ratelimit-remaining"] === undefined ? 1 : +resp.headers["x-ratelimit-remaining"] || 0;

                        if(resp.headers["retry-after"]) {
                            if(resp.headers["x-ratelimit-global"]) {
                                this.globalBlock = true;
                                setTimeout(() => this.globalUnblock(), +resp.headers["retry-after"] || 1);
                            } else {
                                this.ratelimits[route].reset = (+resp.headers["retry-after"] || 1) + now;
                            }
                        } else if(resp.headers["x-ratelimit-reset"]) {
                            if((~route.lastIndexOf("/reactions/:id")) && (+resp.headers["x-ratelimit-reset"] * 1000 - headerNow) === 1000) {
                                this.ratelimits[route].reset = Math.max(now + 250 - this.latencyRef.timeOffset, now);
                            } else {
                                this.ratelimits[route].reset = Math.max(+resp.headers["x-ratelimit-reset"] * 1000 - this.latencyRef.timeOffset, now);
                            }
                        } else {
                            this.ratelimits[route].reset = now;
                        }

                        if(resp.statusCode !== 429) {
                            this._client.emit("debug", `${body && body.content} ${now} ${route} ${resp.statusCode}: ${latency}ms (${this.latencyRef.latency}ms avg) | ${this.ratelimits[route].remaining}/${this.ratelimits[route].limit} left | Reset ${this.ratelimits[route].reset} (${this.ratelimits[route].reset - now}ms left)`);
                        }

                        if(resp.statusCode >= 300) {
                            if(resp.statusCode === 429) {
                                this._client.emit("debug", `${resp.headers["x-ratelimit-global"] ? "Global" : "Unexpected"} 429 (╯°□°）╯︵ ┻━┻: ${response}\n${body && body.content} ${now} ${route} ${resp.statusCode}: ${latency}ms (${this.latencyRef.latency}ms avg) | ${this.ratelimits[route].remaining}/${this.ratelimits[route].limit} left | Reset ${this.ratelimits[route].reset} (${this.ratelimits[route].reset - now}ms left)`);
                                if(resp.headers["retry-after"]) {
                                    setTimeout(() => {
                                        cb();
                                        this.request(method, url, auth, body, file, route, true).then(resolve).catch(reject);
                                    }, +resp.headers["retry-after"]);
                                    return;
                                } else {
                                    cb();
                                    this.request(method, url, auth, body, file, route, true).then(resolve).catch(reject);
                                    return;
                                }
                            } else if(resp.statusCode === 502 && ++attempts < 4) {
                                this._client.emit("debug", "A wild 502 appeared! Thanks CloudFlare!");
                                setTimeout(() => {
                                    this.request(method, url, auth, body, file, route, true).then(resolve).catch(reject);
                                }, Math.floor(Math.random() * 1900 + 100));
                                return cb();
                            }
                            cb();

                            if(response.length > 0) {
                                if(resp.headers["content-type"] === "application/json") {
                                    try {
                                        response = JSON.parse(response);
                                    } catch(err) {
                                        reject(err);
                                        return;
                                    }
                                }
                            }

                            var stack = _stackHolder.stack;
                            if(stack.startsWith("Error\n")) {
                                stack = stack.substring(6);
                            }
                            var err;
                            if(response.code) {
                                err = new DiscordRESTError(req, resp, response, stack);
                            } else {
                                err = new DiscordHTTPError(req, resp, response, stack);
                            }
                            reject(err);
                            return;
                        }

                        if(response.length > 0) {
                            if(resp.headers["content-type"] === "application/json") {
                                try {
                                    response = JSON.parse(response);
                                } catch(err) {
                                    cb();
                                    reject(err);
                                    return;
                                }
                            }
                        }

                        cb();
                        resolve(response);
                    });
                });

                req.setTimeout(15000, function() {
                    reqError = new Error(`Request timed out (>15000ms) on ${method} ${url}`);
                    req.abort();
                });

                if(Array.isArray(data)) {
                    for(var chunk of data) {
                        req.write(chunk);
                    }
                    req.end();
                } else {
                    req.end(data);
                }
            };

            if(this.globalBlock && auth) {
                this.readyQueue.push(() => {
                    if(!this.ratelimits[route]) {
                        this.ratelimits[route] = new SequentialBucket(1, this.latencyRef);
                    }
                    this.ratelimits[route].queue(actualCall, short);
                });
            } else {
                if(!this.ratelimits[route]) {
                    this.ratelimits[route] = new SequentialBucket(1, this.latencyRef);
                }
                this.ratelimits[route].queue(actualCall, short);
            }
        });
    }

    toJSON() {
        var base = {};
        for(var key in this) {
            if(this.hasOwnProperty(key) && !key.startsWith("_")) {
                if(this[key] && typeof this[key].toJSON === "function") {
                    base[key] = this[key].toJSON();
                } else {
                    base[key] = this[key];
                }
            }
        }
        return base;
    }
}

module.exports = RequestHandler;
