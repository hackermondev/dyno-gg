"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const Sentry = require("winston-raven-sentry");
const config_1 = require("./config");
exports.logger = new winston.Logger({
    transports: [
        new Sentry({
            dsn: config_1.config.sentry.dsn,
            level: config_1.config.sentry.logLevel,
        }),
    ],
});
//# sourceMappingURL=logger.js.map