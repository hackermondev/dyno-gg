const Sequelize = require('sequelize');
const config = require('./config');

function getDbInstance() {
	const sequelize = new Sequelize(Object.assign({
		operatorsAliases: false,
		logging: false
	}, config.db));

	sequelize.authenticate()
		.then(() => console.log('Database connection successful'))
		.catch(error => console.error('Database auth error:', error));

	return sequelize;
}

module.exports = {
	getDbInstance
};
