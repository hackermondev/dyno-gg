import * as db from '../mongo';
import { Server, IndexedServer, IndexedServerList } from '../types';
import logger from '../logger';
import { ensureStatsDoc } from './ensureStatsDoc';

export async function fetchAndIndex() : Promise<void> {
    try {
        await ensureStatsDoc();
        logger.debug('Starting listIndexer operation');
        const coll = await db.serverlist_store();
        const projection = { _id: 0, id: 1 }
        const itemsRegular : Array<IndexedServer> = await coll.find({ listed: true }, { projection }).toArray();
        const itemsFeatured : Array<IndexedServer> = await coll.find({ listed: true, featured: true }, { projection }).toArray();
        const itemsPremium : Array<IndexedServer> = await coll.find({ listed: true, premium: true }, { projection }).toArray();

        logger.debug(`Begin indexing of: ${itemsRegular.length} regulars, ${itemsFeatured.length} featured, ${itemsPremium.length} premium servers`);

        await Promise.all([
            index(itemsRegular, "regular"),
            index(itemsFeatured, "featured"),
            index(itemsPremium, "premium"),
        ])

        logger.info('Success: listIndexer operation');
    } catch (e) {
        logger.error('Error: listIndexer operation');
        logger.error(e);
    }
}

// Fisher-Yates (aka Knuth) Shuffle
function shuffleArr(array) : Array<any> {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


async function index(servers : Array<IndexedServer>, type) : Promise<void> {
    try {
        const pageSize = {
			premium: 5,
			featured: 5,
			regular: 20,
        };

        const collname = `serverlist_live_${type}`;
        logger.debug(`Indexing ${collname}`);

        if (!servers || servers.length === 0) {
            logger.warning(`No data for collection ${collname}, backing off`);
            return;
        }

        const beginDate = new Date();
        const coll = await db[collname]();

        servers = shuffleArr(servers.map(s => s.id));

        let spliceResult;
        const pages = [];

        while((spliceResult = servers.splice(0, pageSize[type])).length !== 0) {
            pages.push(spliceResult);
        }

        const list : IndexedServerList = {
            createdAt: new Date(),
            validUntil: new Date(),
            itemCount: servers.length,
            weightSum: 0,
            pageCount: pages.length,
            pages,
        }

        await coll.insert(list);
        const endDate = new Date();
        const timeTaken = Math.abs(endDate.getTime() - beginDate.getTime())
        logger.info(`Succesfully indexed ${collname} in ${timeTaken}ms`);
    } catch (e) {
        logger.error(e);
    }
}