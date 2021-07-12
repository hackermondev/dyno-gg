const Controller = require('../core/Controller');


class Index extends Controller {
    constructor(bot) {
        super(bot);

        return {
            index: {
                method: 'use',
                uri: '/api/v1/*',
                handler: this.auth.bind(this),
            },
        };
    }

    auth(req, res, next) {
        let token = req.get('Authorization');
        if (!token) return res.status(401).json({ error: 'Authorization header missing' });

        let data = this.utils.decrypt(token);

        if (!data) return res.status(401).json({ error: 'Unauthorized' });

        ['id'].forEach(item => {
            res.locals[item] = data[item];
        });

        next();
    }
}

module.exports = Index;
