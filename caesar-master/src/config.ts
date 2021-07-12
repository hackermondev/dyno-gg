import 'envkey';
import * as getenv from 'getenv';

const mapping = {
    mongo: 'MONGO_DSN',
    dsn: ['SENTRY_DSN', ''],
    indexInterval: 'INDEX_INTERVAL',
    deletionGracePeriod: 'DELETION_GRACE_PERIOD',
    deletionOperationInterval: 'DELETION_OP_INTERVAL',
    updateIconsInterval: 'UPDATE_ICONS_INTERVAL',
    logLevel: 'LOG_LEVEL',
}

const config = getenv.multi(mapping);

export default config;