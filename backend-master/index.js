const restify = require('restify');
const config = require('./config/config');
const botInfoRouter = require('./routes/bot-info-router');
const authenticationRouter = require('./routes/oauth-router');
const TokenController = require('./controllers/token-controller');
const authenticationMiddleware = require('./middleware/authentication-middleware');
const utils = require('./utils/utils');

const sequelize = require('./config/db').getDbInstance();

const Bot = require('./models/bots')(sequelize);
const User = require('./models/user')(sequelize);

const tokenController = new TokenController();
tokenController.loadCert('jwtRS256.key');

const server = restify.createServer(config.server.instanceConfig);
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser({mapParams: true}));
const whitelist = utils.processWhitelist(config.whitelist);
server.use((req, res, next) => authenticationMiddleware(req, res, next, whitelist, User, tokenController));

botInfoRouter(server, Bot);
authenticationRouter(server, User, tokenController);

server.listen(config.server.port, config.server.host);
console.log(`Listening on ${config.server.host}:${config.server.port}`);
