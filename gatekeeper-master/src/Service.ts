import * as fs from 'fs';
import * as schedule from 'node-schedule';
import Logger from './logger';
import { checkPatrons } from './operations/checkPatrons';
import { deleteMarkedServers } from './operations/deleteMarkedServers';
import {Patreon} from './Patreon';
const logger = Logger.get('Service');

/**
 * Patreon service
 */
export class Service {
	public job: schedule.Job;
	public patreon: Patreon;

	constructor() {
		this.patreon = new Patreon();
	}

	public async start(): Promise<void> {
		logger.debug('Starting service');
		try {
			schedule.scheduleJob('30 * * * *', async () => {
				try {
					await this.patreon.authenticate();
					const pledges = await this.patreon.getPledges();
					await checkPatrons(pledges);
					await deleteMarkedServers();
				} catch (err) {
					logger.error(err);
				}
			});
		} catch (err) {
			logger.error(err);
		}
	}

	public async dumpPatreons() : Promise<void> {
		logger.debug('Dumping patreons');
		await this.patreon.authenticate();
		const pledges = await this.patreon.getPledges();
		try {
			fs.writeFileSync('pledge_dump.json', JSON.stringify(pledges, null, '\t'));
		} catch (err) {
			console.error(err);
		}
		process.exit(0);
	}
}
