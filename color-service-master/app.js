const blocked = require('blocked');
const express = require('express');
const morgan = require('morgan');
const sha1 = require('sha1');
const app = express();
const color = require('./color');
const config = require('./config');
const dynoav = require('./dynoav');

blocked(ms => {
  console.log(`Blocked: ${ms}ms`);
}, { threshold: 100 });

const checkHash = (req, res, next) => {
    if (!req.query || !req.query.key || !req.query.hash) {
        return res.status(403).send('Forbidden');
    }

    const hash = sha1(`${config.secret}.${req.query.key}`);
    if (hash !== req.query.hash) {
        return res.status(403).send('Forbidden');
    }

    return next();
}

app.use((req, res, next) => {
	res.setHeader('X-Powered-By', 'Dyno/Colors');
	next();
});
app.use(morgan('tiny'));
app.get('/ping', (req, res) => res.send('OK'));
// app.use(checkHash);
app.use('/color', color);
app.use('/dynoav', dynoav);

app.listen(config.port, () => console.log(`API Listening on port ${config.port}!`));
