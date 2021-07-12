import * as db from '../mongo';
import logger from '../logger';

export async function ensureStatsDoc() : Promise<void> {
    try {
        logger.debug('Starting ensureStatsDoc operation');
        const coll = await db.serverlist_store();
        const statsColl = await db.serverlist_invitestats();
        
        const newStatsDocs = await coll.aggregate(
            [
                // left outer join serverlist_store and serverlist_invitestats
                { 
                    "$lookup" : {
                        "from" : "serverlist_invitestats", 
                        "localField" : "id", 
                        "foreignField" : "id", 
                        "as" : "matched_docs",
                    },
                }, 
                // Filter out elements that have a matching doc on serverlist_invitestats already
                { 
                    "$match" : {
                        "matched_docs" : {
                            "$eq" : [],
                        },
                    },
                }, 
                { 
                    "$project" : {
                        "id" : 1.0, 
                        "_id" : 0.0,
                    },
                }, 
                { 
                    "$addFields" : {
                        "inviteTotal" : 0.0, 
                        "dailyStats" : [],
                    },
                },
            ]
        ).toArray();
        
        if(newStatsDocs.length > 0) {
            logger.debug(`Trying to insert ${newStatsDocs.length} invite stats docs`);            
            await statsColl.insertMany(newStatsDocs);
        } else {
            logger.debug(`No invite docs to insert. Backing off`);
        }

        logger.info('Success: ensureStatsDoc operation');
    } catch (e) {
        logger.error('Error: ensureStatsDoc operation');
        logger.error(e);
    }
}