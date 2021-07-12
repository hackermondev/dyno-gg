const Sequelize = require('sequelize');
const utils = require('../utils/utils');

module.exports = function (sequelize) {
	const bots = sequelize.define('bots', {
		id: {
			type: Sequelize.STRING,
			allowNull: false,
			primaryKey: true,
			validate: {
				is: {
					args: utils.idRegex,
					msg: 'Must be a valid ID'
				}
			}
		},
		owners: {
			type: Sequelize.ARRAY(Sequelize.STRING), // eslint-disable-line new-cap
			allowNull: false,
			unique: true,
			validate: {
				isValidUser: utils.validateUserIds
			}
		},
		editors: {
			type: Sequelize.ARRAY(Sequelize.STRING), // eslint-disable-line new-cap
			allowNull: true,
			unique: true,
			validate: {
				isValidUser: utils.validateUserIds
			}
		}, // eslint-disable-line new-cap
		username: Sequelize.STRING,
		avatarUrl: {
			type: Sequelize.STRING,
			validate: {
				isUrl: true
			}
		},
		tags: Sequelize.ARRAY(Sequelize.STRING), // eslint-disable-line new-cap
		websiteUrl: {
			type: Sequelize.STRING,
			validate: {
				isUrl: true
			}
		},
		prefix: Sequelize.STRING,
		inviteUrl: {
			type: Sequelize.STRING,
			allowNull: false,
			validate: {
				is: {
					args: /^https?:\/\/(\w\.)?discordapp.com\/(api\/)?oauth2\/authorize\?(.+?)?client_id=\d+/,
					msg: 'Must be a valid Discord OAuth2 URL'
				}
			}
		},
		descriptionShort: {
			type: Sequelize.STRING,
			validate: {
				max: 200
			}
		},
		descriptionLong: Sequelize.TEXT,
		votes: {
			type: Sequelize.INTEGER,
			validate: {
				min: 0
			}
		},
		tokenId: Sequelize.STRING
	}, {
		tableName: 'Bots',
		timestamps: false
	});

	return bots;
};
