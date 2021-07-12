var colors = require('colors');
colors.setTheme({
    silly: 'rainbow',
    log: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

class Logger {
    constructor() {

    }

    log(msg) {
        console.log(msg);
    }

    info(msg) {
        console.log(msg);
    }

    warn(msg) {
        console.log(msg);
    }

    error(msg) {
        console.log(msg);
    }

    data(msg) {
        console.log(msg);
    }

    debug(msg) {
        console.log(msg);
    }
}

module.exports = Logger;