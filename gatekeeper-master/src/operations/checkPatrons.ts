import moment = require('moment');
import config from '../config';
import Logger from '../logger';
import * as db from '../mongo';
const logger = Logger.get('checkPatrons');

export async function checkPatrons(patreonPledges: PatronPledge[]): Promise<void> {
	try {
		logger.debug('checkPatrons start');
		const stats = {
			serversMarked: 0,
			patronsNotFound: 0,
			patronsDeclined: 0,
			pledgeDeleted: 0,
		};

		const patreonIdToPledgeMap = {};
		patreonPledges.forEach((p : PatronPledge) => patreonIdToPledgeMap[p.id] = p);

		const serversColl = await db.servers();
		const servers = await serversColl.find({
			isPremium: true,
			giveaway: { $exists: false },
			staff: { $exists: false },
			partner: { $exists: false },
			premiumUserId: { $exists: true },
		}).toArray();

		const premiumUsersColl = await db.premiumUsers();
		const premiumUsers = await premiumUsersColl.find({ patreonLinked: true }).toArray();
		const userIdToPremiumUserMap = {};
		premiumUsers.forEach((p : PremiumUser) => userIdToPremiumUserMap[p._id] = p);

		const deletionColl = await db.patreonDeleteQueue();
		const markedServers = await deletionColl.find({}, { projection: { id: 1 }}).toArray();
		const markerServerIdMap = {};
		markedServers.forEach((s : any) => markerServerIdMap[s._id] = s);

		await Promise.all(servers.map(async (server : any) => {
			if (markerServerIdMap[server._id]) {
				return;
			}

			const premiumUser : PremiumUser = userIdToPremiumUserMap[server.premiumUserId];

			if (!premiumUser) {
				stats.patronsNotFound += 1;
				if (config.disableUnlinked === true) {
					stats.serversMarked += 1;
					logger.info(`Marked server ${server._id} for deletion`, 'markedForDeletion', {
						serverId: server._id,
						premiumUserId: server.premiumUserId,
						premiumSince: server.premiumSince,
						type: 'no_patreon_linked',
					});
					await deletionColl.insert({
						_id: server._id,
						userid: server.premiumUserId,
						type: 'no_patreon_linked',
						disableAt: moment().add(1, 'days').toDate(),
					});
					return;
				}
			}

			const pledge : PatronPledge = patreonIdToPledgeMap[premiumUser.patreonUserId];

			if (!pledge) {
				stats.pledgeDeleted += 1;
				stats.serversMarked += 1;
				logger.info(`Marked server ${server._id} for deletion`, 'markedForDeletion', {
					serverId: server._id,
					premiumUserId: server.premiumUserId,
					premiumSince: server.premiumSince,
					premiumUser: premiumUser,
					type: 'deleted_pledge',
				});
				await deletionColl.insert({
					_id: server._id,
					userid: server.premiumUserId,
					patreonUserId: premiumUser.patreonUserId,
					type: 'deleted_pledge',
					disableAt: moment().add(1, 'days').toDate(),
				});
				return;
			}

			if (pledge.pledge.declined_since) {
				stats.patronsDeclined += 1;
				stats.serversMarked += 1;
				logger.info(`Marked server ${server._id} for deletion`, 'markedForDeletion', {
					serverId: server._id,
					premiumUserId: server.premiumUserId,
					premiumSince: server.premiumSince,
					premiumUser: premiumUser,
					pledge: pledge,
					type: 'declined_pledge',
				});
				await deletionColl.insert({
					_id: server._id,
					userid: server.premiumUserId,
					patreonUserId: pledge.id,
					type: 'declined_pledge',
					disableAt: moment().add(7, 'days').toDate(),
				});
				return;
			}
		}));

		logger.info('Success: checkPatrons operation');
	} catch (e) {
		logger.error(e);
	}
}
