const lorem = require('lorem-ipsum');
const sequelize = require('../config/db').getDbInstance();
const Bot = require('../models/bots')(sequelize);

sequelize.sync();

const rnd = (min = 0, max = 1) => Math.round((Math.random() * (max - min)) + min);
const randomId = () => new Array(3).fill(null).map(() => rnd(1e5, 1e6 - 1)).join('');
const allTags = ['Anime', 'Moderation', 'Utility', 'Fun', 'Music', 'Games', 'Levels', 'Currency', 'Logging', 'Localized'];
const generateArray = (min, max, fill) => new Array(rnd(min, max)).fill(null).map(() => fill());

Bot.build(new Array(50).fill(null).map(() => {
	const data = { };

	data.id = randomId();
	data.owners = generateArray(1, 3, randomId);
	data.editors = Math.random() > 0.5 ? generateArray(1, 5, randomId) : undefined;
	data.tags = allTags.filter(() => Math.random() > 0.7);
	data.websiteUrl = Math.random() > 0.7 ? `https://example.com/${data.id}` : undefined;
	data.inviteUrl = `https://discordapp.com/oauth2/authorize?=client_id=${randomId()}&scope=bot${Math.random() > 0.5 ? '&permissions=271969479' : ''}`;
	data.descriptionShort = lorem({count: 10, units: 'words'});
	data.descriptionLong = lorem({count: 2, units: 'paragraphs'});
	data.username = lorem({
		count: rnd(1, 2),
		units: 'words'
	}).slice(0, -1) + ' Bot';
	data.avatarUrl = 'https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png';
	data.prefix = Math.random() > 0.2 ? 'abcdefghijklmnopqrstuvwxyz'.substr(rnd(0, 25), 1) + '!.+=-]})?>|~'.substr(rnd(0, 11), 1) : undefined;

	return data;
})).forEach(async bot => {
	try {
		await bot.validate();
		bot.save();
	} catch (error) {
		console.error(error);
	}
});
