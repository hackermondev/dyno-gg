'use strict';

module.exports = function reloadcmds(dyno) {
        Loader.loadCommands(dyno);
        process.send({ op: 'resp', d: 'done' });
};