const Sequelize = require('sequelize');
const utils = require('../utils/utils');

module.exports = function (sequelize) {
	const users = sequelize.define('users', {
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
		username: Sequelize.STRING,
		avatarUrl: Sequelize.STRING,
		tokenId: Sequelize.STRING,
		lastAuth: Sequelize.DATE,
		permissionlevel: {
			type: Sequelize.INTEGER,
			validate: {
				min: -1
			}
		}
	}, {
		tableName: 'Users',
		timestamps: false
	});

	return users;
};
