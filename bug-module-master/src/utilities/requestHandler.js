const superagent = require("superagent");

class requestHandler {
    constructor() {
        this.discordBaseURL = "https://discordapp.com/api/v6";
        this.trelloBaseURL = "https://api.trello.com/1";
        this.rateLimitCollection = new Map();
        this.queueCollection = new Map();
    }

    async request(endpoint, domain, method, headers, query, body, attachments) {
        domain = (domain.endsWith("/") === true) ? (domain.slice(0, -1).toLowerCase()) : domain.toLowerCase();
        endpoint = ((endpoint.startsWith("/") && (endpoint.endsWith("/")) === true) ? endpoint.slice(1, -1) :
            (endpoint.startsWith("/") === true) ? endpoint.slice(1) :
                (endpoint.endsWith("/") === true) ? endpoint.slice(0, -1) : endpoint);
        method = method.toUpperCase();
        const requestURL = `${(domain === "discord") ? this.discordBaseURL :
            (domain === "trello") ? this.trelloBaseURL : domain}/${endpoint}`;

        const queue = this.queueCollection.get(endpoint) || Promise.resolve();
        const request = queue.then(() => this.conditionalsHandler(endpoint, requestURL, method, headers, query, body, attachments));
        const tail = request.catch(() => {});
        this.queueCollection.set(endpoint, tail);

        try {
            return await request;
        }
        finally {
            if (this.queueCollection.get(endpoint) === tail) {
                this.queueCollection.delete(endpoint);
            }
        }
    }

    superagent(requestURL, method, headers, queryParams, fields, attachments) {
        if (attachments !== undefined) {
            const { file, buffer, details } = attachments;
            return superagent(method, requestURL)
                .set(headers || {})
                .query(queryParams || {})
                .field(fields || {})
                .attach(file, buffer, details);
        }
        else {
            return superagent(method, requestURL)
                .set(headers || {})
                .query(queryParams || {})
                .send(fields);
        }
    }

    setOrEditRateLimitCache(endpoint, header, edit, statusCode) {
        const discordHeader = Number(header["x-ratelimit-remaining"]);
        const trelloTokenHeader = Number(header["x-rate-limit-api-token-remaining"]);
        const trelloKeyHeader = Number(header["x-rate-limit-api-key-remaining"]);
        const trelloTokenReset = Number(header["x-rate-limit-api-token-interval-ms"]) + Date.now();
        const trelloKeyReset = Number(header["x-rate-limit-api-key-interval-ms"]) + Date.now();

        if ((discordHeader === 0) || (statusCode === 429)) {
            const discordResetTime = Number(header["x-ratelimit-reset"]) * 1000;
            const discordRetryAfter = Number(header["retry-after"]) + Date.now();
            const timestamp = discordResetTime ^ ((discordResetTime ^ discordRetryAfter) & -(discordResetTime < discordRetryAfter));

            if (header["x-ratelimit-global"]) {
                this.rateLimitCollection.set("global", discordRetryAfter);
                return;
            }
            else {
                this.rateLimitCollection.set(endpoint, timestamp);
                return;
            }
        }
        else if ((trelloTokenHeader | trelloKeyHeader) === 0) {
            const timestamp = trelloTokenReset ^ ((trelloTokenReset ^ trelloKeyReset) & -(trelloTokenReset < trelloKeyReset));

            this.rateLimitCollection.set(endpoint, timestamp);
            return;
        }
        else if (trelloTokenHeader === 0) {
            const timestamp = trelloTokenReset;

            this.rateLimitCollection.set(endpoint, timestamp);
            return;
        }
        else if (trelloKeyHeader === 0) {
            const timestamp = trelloKeyReset;

            this.rateLimitCollection.set(endpoint, timestamp);
            return;
        }
        else if (edit === true) {
            this.rateLimitCollection.delete(endpoint);
            return;
        }
    }

    async conditionalsHandler(endpoint, requestURL, method, headers, query, body, attachments) {
        try {
            if ((this.rateLimitCollection.has(endpoint) === false) && (this.rateLimitCollection.has("global") === false)) {
                const response = await this.superagent(requestURL, method, headers, query, body, attachments);
                this.setOrEditRateLimitCache(endpoint, response.header, false);
                this.queueCollection.delete(endpoint);
                return response;
            }
            else {
                const endpointTimestamp = this.rateLimitCollection.get(endpoint) || 0;
                const globalTimestamp = this.rateLimitCollection.get("global") || 0;
                let timestamp;

                if (requestURL.startsWith(this.discordBaseURL)) {
                    timestamp = endpointTimestamp ^ ((endpointTimestamp ^ globalTimestamp) & -(endpointTimestamp < globalTimestamp));
                }
                else {
                    timestamp = endpointTimestamp;
                }
                if (timestamp >= Date.now()) {
                    const response = new Promise((resolve, reject) => {
                        setTimeout(async () => {
                            try {
                                const response = await this.superagent(requestURL, method, headers, query, body, attachments);
                                resolve(response);
                                this.setOrEditRateLimitCache(endpoint, response.header, true);
                            }
                            catch (error) {
                                if (error.status === 429) { // Rate-Limited error
                                    this.setOrEditRateLimitCache(endpoint, error.response.header, false, 429);
                                    this.conditionalsHandler(endpoint, requestURL, method, headers, query, body, attachments)
                                        .then(response => resolve(response))
                                        .catch(error => reject(error));
                                }
                                else {
                                    reject(error);
                                }
                            }
                        }, timestamp - Date.now());
                    });
                    return response;
                }
                else {
                    const response = await this.superagent(requestURL, method, headers, query, body, attachments);
                    this.setOrEditRateLimitCache(endpoint, response.header, true);
                    return response;
                }
            }
        }
        catch (error) {
            if (error.status === 429) { // Rate-Limited error
                this.setOrEditRateLimitCache(endpoint, error.response.header, false, 429);
                const response = new Promise((resolve, reject) => {
                    setTimeout(() => { // https://stackoverflow.com/a/20999077/10901309
                        this.conditionalsHandler(endpoint, requestURL, method, headers, query, body, attachments)
                            .then(response => resolve(response))
                            .catch(error => reject(error));
                    }, 0);
                });

                return response;
            }
            else {
                throw error;
            }
        }
    }
}

module.exports = new requestHandler();