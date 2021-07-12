const express = require('express');
const { renderRankCard } = require('./renderers/rankBanner');

const app = express();

app.get('/', (req, res) => {
  // Needed for LB health checks
  res.status(200).end();
});

app.get('/card', async function (req, res) {
    const { accentColor, textColor, avatarUrl, currXP, levelXP, rank, rankCount, name, bgUrl, level, prevLevelXP } = req.query;

    res.contentType('image/png');

    const now = new Date().getTime();
    res.send(await renderRankCard(accentColor, textColor, avatarUrl, currXP, levelXP, rank, rankCount, name, bgUrl, level, prevLevelXP))

    const elapsed = new Date().getTime() - now;
    console.log(elapsed, 'ms');
});

app.listen(3000, function () {
  console.log('Listening on port 3000!');
});