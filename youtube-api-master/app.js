require('dotenv').config();
const blocked = require('blocked');
const express = require('express');
const morgan = require('morgan');
const app = express();
const info = require('./info');
const search = require('./search');

blocked(ms => {
  console.log(`Blocked: ${ms}ms`);
}, { threshold: 100 });

const checkToken = (req, res, next) => {
    if (req.get('Authorization') === process.env.AUTH_TOKEN) {
        next();
        return;
    }

    res.sendStatus(401).end();
}

app.use((req, res, next) => {
	res.setHeader('X-Powered-By', 'Dyno/Coal');
	next();
});
app.use(morgan('tiny'));
app.get('/ping', (req, res) => res.send('OK'));
app.use(checkToken);
app.use('/info', info);
app.use('/search', search);

app.listen(process.env.PORT, () => console.log(`API Listening on port ${process.env.PORT}!`));
