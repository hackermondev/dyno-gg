import * as db from '../mongo';
import logger from '../logger';
import config from '../config';

export async function updateIcons() : Promise<void> {
    logger.debug('Starting updateIcons operation');
    const beginDate = new Date();

    const serversColl = await db.servers();
    const serverlistStoreColl = await db.serverlist_store();

    let allIds = await serverlistStoreColl.find({}, { projection: { _id: 0, id: 1, icon: 1 } }).toArray();
    const allIdsObj = {};
    // Convert to an object to access properties by id and prevent .finds
    allIds.forEach((i) => {
        allIdsObj[i.id] = i;
    })

    const batchSize = 30;
    let skip = 0;
    let iconsUpdated = 0;

    const bulk = serverlistStoreColl.initializeUnorderedBulkOp();
    do {
        const batch = await serversColl.find({ _id: { $in: allIds.slice(skip, skip + batchSize).map((i) => i.id) }}, { projection: { _id: 1, iconURL: 1 }}).toArray();
        batch.forEach((guildConfig) => {
            //listedObj holds the current guild info listed on the servers page
            const listedObj = allIdsObj[guildConfig._id];

            if(!guildConfig.iconURL) {
                if(!listedObj.icon) {
                    //both icons undefined
                    return;
                }

                // guildConfig is the most recent info. If undefined, unset the icon
                bulk.find({ id: listedObj.id }).updateOne({ $unset: { icon: 1 } });
                iconsUpdated++;
            } else if (!listedObj.icon) {
                // if guildConfig icon exists and listing one doesn't, just set it instead of comparing
                bulk.find({ id: listedObj.id }).updateOne({ $set: { icon: guildConfig.iconURL } });
                iconsUpdated++
            } else {
                //both icons are set, compare their hashes
                const iconHashRegex = /(?:(?:icons\/[0-9]*)|(?:[0-9]*\/icon))\/(.*)\..*/;
                const listedIconHash = listedObj.icon.match(iconHashRegex)[1];
                const guildConfigIconHash = guildConfig.iconURL.match(iconHashRegex)[1];

                if(listedIconHash !== guildConfigIconHash) {
                    bulk.find({ id: listedObj.id }).updateOne({ $set: { icon: guildConfig.iconURL } });
                    iconsUpdated++;
                }
            }
        });

        skip += batchSize;
    } while(skip < allIds.length);
    
    await bulk.execute();

    const endDate = new Date();
    const timeTaken = Math.abs(endDate.getTime() - beginDate.getTime())
    logger.info(`Success: updateIcons operation, ${iconsUpdated} icon updates in ${timeTaken}ms`);
}
