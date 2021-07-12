const path = require('path');
const { Worker } = require('worker_threads');
const glob = require('glob-promise');
const db = require('./database');
const logger = require('./logger')('index', 'main');

function createWorker(filename) {
    const worker = new Worker(filename);
    worker.on('error', logger.error);
    worker.on('exit', code => {
        if (code === 'SIGTERM') {
            return logger.info(`Worker ${path.basename(filename)} gracefully exited.`);
        }
        logger.error(`Worker ${path.basename(filename)} exited with code ${code}.`);
        createWorker(filename);
    });

    return worker;
}

async function main() {
    // Create task workers
    const directory = path.join(__dirname, 'tasks');
    try {
        const tasks = await glob('**/*.js', {
            cwd: directory,
            root: directory,
            absolute: true,
        });

        for (let task of tasks) {
            createWorker(task);
        }
    } catch (err) {
        logger.error(err);
    }
}

main();
