const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const Purger = require('../utils/Purger');
const logger = require('../logger')('Autopurge', 'autopurge');

class Autopurge extends Task {
    constructor() {
		super();

		if (!config.isPremium) {
			return process.exit('SIGTERM');
		}

		logger.info('Starting Autopurge task.');
		
        this.purger = new Purger(this.client);
		// this.schedule('*/1 * * * *', this.purge.bind(this));
    }

    async purge() {
		try {
			var docs = await this.models.Autopurge.find({ disabled: { $ne: true }, nextPurge: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		logger.debug(`Found ${docs.length} channels to purge.`);

		this.asyncForEach(docs, async (doc) => {
			if (doc.interval < 1) {
				return this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
			}

			const guildConfig = await this.models.Server.findOne({ _id: doc.guild }).lean().exec().catch(() => null);
            if (!guildConfig.modules.hasOwnProperty('Autopurge') && guildConfig.modules.Autopurge === false) {
                return this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
			}

			logger.debug(`Purging ${doc.guild}`);

			return this.purger.purge(doc.channel, { limit: 5000 })
				.then(() => {
					const nextPurge = moment().add(doc.interval, 'minutes').toDate();
					return this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: nextPurge } });
				})
				.catch((err) => {
					if (err && err.code) {
						if (err.code === 10003) {
							this.logger.info(`Auto removing ${doc.guild} - ${doc.channel}, Unknown Channel`);
							return this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
						} else if (err.code === 50001) {
							this.logger.info(`Auto removing ${doc.guild} - ${doc.channel}, Missing Access`);
							return this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
						}

						this.logger.error(err);
					}

					return null;
				});
		});
	}
}

const task = new Autopurge();
