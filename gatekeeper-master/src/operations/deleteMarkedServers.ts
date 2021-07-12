import moment = require('moment');
import config from '../config';
import Logger from '../logger';
import * as db from '../mongo';
const logger = Logger.get('deleteMarkedServers');

export async function deleteMarkedServers(): Promise<void> {
	const deletionColl = await db.patreonDeleteQueue();
	const markedServers = await deletionColl.find({});

	const serverColl = await db.servers();

	const serversToDisable = [];
	markedServers.forEach((s : any) => {
		if (moment(s.disableAt).isBefore(moment())) {
			serversToDisable.push(s._id);
		}
	});

	if (serversToDisable.length === 0) {
		logger.info('No servers to delete.');
		return;
	}

	await serverColl.updateMany(
		{ _id: { $in: serversToDisable } },
		{ $unset: { premiumSince: 1, premiumUserId: 1, subscriptionType: 1, isPremium: 1 } },
	);

	await deletionColl.removeMany({ _id: { $in: serversToDisable } });
}
