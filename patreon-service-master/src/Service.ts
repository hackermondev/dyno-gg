import * as schedule from 'node-schedule';
import {logger} from './logger';
import * as models from './models';
import {Patreon} from './Patreon';

/**
 * Patreon service
 */
export class Service {
	public job: schedule.Job;
	public patreon: Patreon;

	constructor() {
		this.patreon = new Patreon();
	}

	public start(): void {
		this.patreon.authenticate()
			.then(() => {
				this.job = schedule.scheduleJob('*/5 * * * *', this.processPledges.bind(this));
			})
			.catch((err: Error) => {
				throw err;
			});
	}

	private async processPledges() {
		let pledges: PatronPledge[];
		let existingPatrons: models.PatronDocument[];

		logger.info(`[${new Date()}] Pledge processing started.`);

		try {
			pledges = await this.patreon.getPledges();
		} catch (err) {
			logger.error(err);
			return;
		}

		try {
			existingPatrons = await (await models.patrons.find({ deleted: false })).fetchAll();
		} catch (err) {
			logger.error(err);
			return;
		}

		await this.addNewPatrons(pledges).catch((err: string) => logger.error(err));
		this.updateDeletedPatrons(pledges, existingPatrons).catch((err: string) => logger.error(err));
		this.updateRenewedPatrons(pledges, existingPatrons).catch((err: string) => logger.error(err));
	}

	private async addNewPatrons(pledges: PatronPledge[]): Promise<void> {
		let upsertCount = 0;

		for (const pledge of pledges) {
			await models.patrons.updateOne({ id: pledge.id }, { $set: pledge }, { upsert: true })
				.then(() => {
					upsertCount = upsertCount + 1;
				})
				.catch((err: Error) => {
					throw err;
				});
		}
	}

	private async updateRenewedPatrons(pledges: PatronPledge[], existingPatrons: models.PatronDocument[]): Promise<void> {
		let renewedCount = 0;

		for (const patron of existingPatrons) {
			const foundPatron = pledges.find((p: PatronPledge) => p.id === patron.id);

			if (foundPatron != undefined && foundPatron.pledge.declined_since == undefined && patron.pledge.declined_since != undefined) {
				await models.patrons.updateOne({ id: patron.id }, { $set: { deleted: false, 'pledge.declined_since': patron.pledge.declined_since } })
					.then(() => {
						renewedCount = renewedCount + 1;
						logger.debug(`Deleted ${patron.id}`);
					})
					.catch((err: Error) => {
						throw err;
					});
			}
		}

		if (renewedCount > 0) {
			logger.info(`Renewed ${renewedCount} patrons.`);
		}
	}

	private async updateDeletedPatrons(pledges: PatronPledge[], existingPatrons: models.PatronDocument[]): Promise<void> {
		let deletedCount = 0;

		for (const patron of existingPatrons) {
			const foundPatron = pledges.find((p: PatronPledge) => p.id === patron.id);

			if (foundPatron == undefined || foundPatron.pledge.declined_since != undefined) {
				await models.patrons.updateOne({ id: patron.id }, { $set: { deleted: true, 'pledge.declined_since': patron.pledge.declined_since } })
					.then(() => {
						deletedCount = deletedCount + 1;
						logger.debug(`Deleted ${patron.id}`);
					})
					.catch((err: Error) => {
						throw err;
					});
			}
		}

		if (deletedCount > 0) {
			logger.info(`Deleted ${deletedCount} patrons.`);
		}
	}
}
