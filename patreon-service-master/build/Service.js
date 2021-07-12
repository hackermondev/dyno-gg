"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schedule = require("node-schedule");
const logger_1 = require("./logger");
const models = require("./models");
const Patreon_1 = require("./Patreon");
/**
 * Patreon service
 */
class Service {
    constructor() {
        this.patreon = new Patreon_1.Patreon();
    }
    start() {
        this.job = schedule.scheduleJob('*/5 * * * *', this.processPledges.bind(this));
    }
    async processPledges() {
        let pledges;
        let existingPatrons;
        logger_1.logger.info(`[${new Date()}] Pledge processing started.`);
        try {
            pledges = await this.patreon.getPledges();
        }
        catch (err) {
            logger_1.logger.error(err);
            return;
        }
        try {
            existingPatrons = await (await models.patrons.find({ deleted: false })).fetchAll();
        }
        catch (err) {
            logger_1.logger.error(err);
            return;
        }
        await this.addNewPatrons(pledges).catch((err) => logger_1.logger.error(err));
        this.updateDeletedPatrons(pledges, existingPatrons).catch((err) => logger_1.logger.error(err));
        this.updateRenewedPatrons(pledges, existingPatrons).catch((err) => logger_1.logger.error(err));
    }
    async addNewPatrons(pledges) {
        let upsertCount = 0;
        for (const pledge of pledges) {
            await models.patrons.updateOne({ id: pledge.id }, { $set: pledge }, { upsert: true })
                .then(() => {
                upsertCount = upsertCount + 1;
            })
                .catch((err) => {
                throw err;
            });
        }
    }
    async updateRenewedPatrons(pledges, existingPatrons) {
        let renewedCount = 0;
        for (const patron of existingPatrons) {
            const foundPatron = pledges.find((p) => p.id === patron.id);
            if (foundPatron != undefined && foundPatron.pledge.declined_since == undefined && patron.pledge.declined_since != undefined) {
                await models.patrons.updateOne({ id: patron.id }, { $set: { deleted: false, 'pledge.declined_since': patron.pledge.declined_since } })
                    .then(() => {
                    renewedCount = renewedCount + 1;
                    logger_1.logger.debug(`Deleted ${patron.id}`);
                })
                    .catch((err) => {
                    throw err;
                });
            }
        }
        if (renewedCount > 0) {
            logger_1.logger.info(`Renewed ${renewedCount} patrons.`);
        }
    }
    async updateDeletedPatrons(pledges, existingPatrons) {
        let deletedCount = 0;
        for (const patron of existingPatrons) {
            const foundPatron = pledges.find((p) => p.id === patron.id);
            if (foundPatron == undefined || foundPatron.pledge.declined_since != undefined) {
                await models.patrons.updateOne({ id: patron.id }, { $set: { deleted: true, 'pledge.declined_since': patron.pledge.declined_since } })
                    .then(() => {
                    deletedCount = deletedCount + 1;
                    logger_1.logger.debug(`Deleted ${patron.id}`);
                })
                    .catch((err) => {
                    throw err;
                });
            }
        }
        if (deletedCount > 0) {
            logger_1.logger.info(`Deleted ${deletedCount} patrons.`);
        }
    }
}
exports.Service = Service;
//# sourceMappingURL=Service.js.map