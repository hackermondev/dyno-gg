'use strict';

const base62 = require('base62');
const redis = require('../core/redis');

exports.shorten = async function shorten(key, id, data) {
	const shortid = base62.encode(id);
	const rediskey = `${key}.${shortid}`;

	try {
		var result = await redis.getAsync(rediskey);
	} catch (err) {
		throw err;
	}

	if (result) {
		try {
			var parsed = JSON.parse(result);
		} catch (err) {
			throw err;
		}

		if (parsed.id === id) {
			throw new Error(`Record already exists`);
		}

		return this.shorten(key, id, data);
	}

	data = {
		shortid: shortid,
		data: data,
		uses: 0,
		createdAt: Date.now(),
	};

	try {
		var datastr = JSON.stringify(data);
	} catch (err) {
		throw new Error(`Unable to stringify data.`);
	}

	try {
		await redis.setAsync(rediskey, datastr);
	} catch (err) {
		throw new Error(`Unable to save data.`);
	}

	return shortid;
};

exports.geturl = async function geturl(key, shortid) {
	const rediskey = `${key}.${shortid}`;

	try {
		var result = await redis.getAsync(rediskey);
	} catch (err) {
		throw err;
	}

	if (!result) {
		throw new Error(`Record not found`);
	}

	try {
		var parsed = JSON.parse(result);
	} catch (err) {
		throw err;
	}

	if (!parsed) {
		throw new Error(`Record not found.`);
	}

	if (parsed && parsed.hasOwnProperty('uses')) {
		parsed.uses = parseInt(parsed.uses) + 1;
		var parsedstr = JSON.stringify(parsed);
		redis.setAsync(rediskey, parsedstr).catch(() => false);
	}

	return parsed;
};
