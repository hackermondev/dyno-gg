/**
 * Regex to evaluate whether a string is a valid discord id
 * @type {RegExp}
 */
const idRegex = /\d{17,19}/;
const UrlPattern = require('url-pattern');

/**
 * Takes an array of discord ids and validates them for a valid format
 * @param {String[]} value - array of discord ids
 * @return {String[]} - returns the passed value
 */
function validateUserIds(value) {
	const values = Array.isArray(value) ? value : [value];
	values.forEach(v => {
		if (!idRegex.test(v)) {
			throw new Error('Invalid discord id');
		}
	});
	return value;
}

function processWhitelist(whitelist) {
	const processedWhitelist = [];
	for (const item of whitelist) {
		processedWhitelist.push({
			pattern: new UrlPattern(item.path),
			method: item.method || 'all'
		});
	}
	return processedWhitelist;
}

module.exports = {idRegex, validateUserIds, processWhitelist};
