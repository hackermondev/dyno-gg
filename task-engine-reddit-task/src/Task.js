const Eris = require('eris');
const path = require('path');
const glob = require('glob-promise');
const schedule = require('node-schedule');
const config = require('./config');
const db = require('./database');

const MAX_ITERATIONS_PER_TICK = 500;

class Task {
    constructor() {
        this.client = new Eris(`Bot ${config.token}`, { restMode: true });
        this.db = db;
        this.models = db.models;
        this.registerModels();
    }

    schedule(interval, task) {
        return schedule.scheduleJob(interval, task);
    }

    /**
     * Runs an asnychronous iteration over an object or array.
     * Iteration cycles are spread over multiple ticks according to maxIterationsPerTick.
     * The function can throw an error with the message "resolve" to stop the iteration.
     *
     * @param o The object or array to be iterated over
     * @param fn The async function to be called on every interation
     * @param maxIterationsPerTick The max iteration that should be done per tick
     * @returns A promise that resolves when the operation is done. Will reject when fn throws an unexpected error.
     */
    asyncForEach(o, fn, maxIterationsPerTick) {
        if (maxIterationsPerTick == null)
            maxIterationsPerTick = MAX_ITERATIONS_PER_TICK;
        return new Promise((resolve, reject) => {
            const keys = Object.keys(o);
            let offset = 0;
            if (keys.length < 1)
                return resolve();
            (function next() {
                try {
                    const left = keys.length - offset;
                    const max = offset + (left > maxIterationsPerTick ? maxIterationsPerTick : left);
                    for (offset; offset < max; offset++) {
                        fn(o[keys[offset]], keys[offset], o, offset);
                    }
                    offset--;
                }
                catch (e) {
                    if (e.message === 'resolve')
                        return resolve();
                    return reject(e);
                }
                if (++offset < keys.length)
                    global.setImmediate(next);
                else
                    resolve();
            }());
        });
    }

    sendDM(userId, content) {
		// this.statsd.increment(`messages.dm`);
		return new Promise((resolve, reject) =>
			this.client.getDMChannel(userId)
				.catch(reject)
				.then((channel) => {
					if (!channel) {
						return reject('Channel is undefined or null.');
					}
					return this.sendMessage(channel, content).catch(() => false);
				}));
	}

    async registerModels() {
        // Register models
        const directory = path.join(__dirname, 'models');
        try {
            const models = await glob('**/*.js', {
                cwd: directory,
                root: directory,
                absolute: true,
            });

            for (const file of models) {
                const model = require(file);
                const schema = new this.db.Schema(model.skeleton || model.schema, model.options);
                this.db.registerModel({ name: model.name, schema });
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

module.exports = Task;
