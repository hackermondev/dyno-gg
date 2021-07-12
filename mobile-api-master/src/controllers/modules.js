const Controller = require('../core/Controller');

class Modules extends Controller {
    constructor(bot) {
        super(bot);

        return {
            getModules: {
                method: 'get',
                uri: '/api/v1/modules/:guildID',
                handler: this.getModules.bind(this),
            },
            toggleModule: {
                method: 'post',
                uri: '/api/v1/modules/:guildID/toggle',
                handler: this.toggleModule.bind(this),
            },
            getModuleSettings: {
                method: 'get',
                uri: '/api/v1/modules/:guildID/:module',
                handler: this.getModuleSettings.bind(this),
            },
            updateModule: {
                method: 'post',
                uri: '/api/v1/modules/:guildID/update',
                handler: this.updateModule.bind(this),
            },
        };
    }

    getModules(req, res) {

    }

    getModuleSettings(req, res) {

    }

    toggleModule(req, res) {

    }

    updateModule(req, res) {

    }
}

module.exports = Modules;
