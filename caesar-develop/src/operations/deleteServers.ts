import * as db from '../mongo';
import logger from '../logger';
import * as Raven from 'raven';
import config from '../config';

export async function deleteServers() : Promise<void> {
    try {
        logger.debug('Starting deleteServers operation');
        const yesterday = new Date(new Date().getTime() - (config.deletionGracePeriod * 60 * 1000)).getTime();
        const coll = await db.serverlist_store();
        await coll.updateMany({ markedForDeletionAt: { $lt: yesterday }}, { $set: { listed: false }, $unset: { markedForDeletionAt: 1 }});
        logger.info('Success: deleteServers operation');
    } catch(e) {
        logger.error('Error: deleteServers operation');
        logger.error(e);
        Raven.captureException(e);
    }
}
