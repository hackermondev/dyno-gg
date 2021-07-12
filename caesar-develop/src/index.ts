import config from './config';
import * as Raven from 'raven';
import { fetchAndIndex } from './operations/listIndexer';
import { deleteServers } from './operations/deleteServers';
import { updateIcons } from './operations/updateIcons';

async function main() {
    beginLoop();
}

async function beginLoop() {
    await fetchAndIndex();
    await deleteServers();
    await updateIcons();
    setInterval(fetchAndIndex, config.indexInterval * 60 * 1000);
    setInterval(deleteServers, config.deletionOperationInterval * 60 * 1000);
    setInterval(updateIcons, config.updateIconsInterval * 60 * 1000);
}

Raven.config(config.dsn).install();
Raven.context(main);