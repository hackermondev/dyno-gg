'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const config = require('./config');

class Utils {
	constructor() {
		this.channelRegex = new RegExp('{#([a-zA-Z0-9-_]+)}', 'g');
		this.roleRegex = new RegExp('{&([a-zA-Z0-9-_ ]+)}', 'g');
		this.userRegex = new RegExp('{@(.*)}', 'g');
		this.cleanRegex = new RegExp('([_\*`])', 'g'); // eslint-disable-line

		this.colors = {
			blue: { hex: '#117ea6' },
			green: { hex: '#23d160' },
			orange: { hex: '#ff470f' },
		};

		for (const key in this.colors) {
			this.colors[key].int = this.hexToInt(this.colors[key].hex);
		}
	}

	/**
	 * Returns files within a directory recursively
	 * @param  {String} dir Path to directory
	 * @returns {Promise.<Array>}
	 */
	async readdirRecursive(dir) {
		let list = [],
			files = fs.readdirSync(dir),
			dirs;

		function isDir(fname) {
			return fs.existsSync(path.join(dir, fname)) ?
				fs.statSync(path.join(dir, fname)).isDirectory() : false;
		}

		dirs = files.filter(isDir);

		files = files.filter(file => !isDir(file));
		files = files.map(file => path.join(dir, file));

		list = list.concat(files);

		while (dirs.length) {
			const l = await this.readdirRecursive(path.join(dir, dirs.shift()));
			list = list.concat(l);
		}

		return Promise.resolve(list);
		// return callback ? callback(list) : list;
	}

	/**
	 * Check if file exists
	 * @param   {String} file Path to file
	 * @returns {Boolean}     Whether the file exists or not
	 */
	existsSync(file) {
		try {
			fs.accessSync(file);
			return true;
		} catch (e) {
			return false;
		}
	}

	upick(o, ...props) {
		return Object.assign({}, ...Object.keys(o).filter(k => ![...props].includes(k))
			.map(prop => ({ [prop]: o[prop] })));
	}

	sha256(data) {
		return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
	}

	encrypt(str) {
		if (!config.cryptkey) throw new Error('Missing Encryption Key.');

		let algo = 'aes-256-ctr',
			salt = config.cryptkey,
			cipher = crypto.createCipher(algo, salt),
			crypted = cipher.update(str, 'utf8', 'hex');

		crypted += cipher.final('hex');
		return crypted;
	}

	decrypt(str) {
		if (!config.cryptkey) throw new Error('Missing Encryption Key.');

		let algo = 'aes-256-ctr',
			salt = config.cryptkey,
			decipher = crypto.createDecipher(algo, salt),
			dec = decipher.update(str, 'hex', 'utf8');

		dec += decipher.final('utf8');
		return dec;
	}

	nextTick() {
		return new Promise(resolve => process.nextTick(resolve));
	}

	/**
	 * Pad a string
	 * @param {String} str The string to pad
	 * @param {Number} n The length of the padded string
	 * @returns {String}
	 */
	pad(str, n) {
		if (typeof str === 'number') str = str.toString();
		if (!str) return ' '.repeat(n);

		return str.length < n ? (str + ' '.repeat(n)).slice(0, n) : str;
	}

	/**
	 * Left pad a string
	 * @param {String} str The string to pad
	 * @param {Number} n The length of the padded string
	 * @returns {String}
	 */
	lpad(str, n) {
		if (typeof str === 'number') str = str.toString();
		if (!str) return ' '.repeat(n);

		return str.length < n ? (' '.repeat(n) + str).slice(-(n - str.length)) : str;
	}

	/**
	 * Uppercase the first letter in a word
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	ucfirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Shuffle array, taken from stackoverflow
	 * @param  {Array} arr Array to shuffle
	 * @returns {Array}
	 */
	shuffleArray(arr) {
		for (let i = arr.length; i; i--) {
			let j = Math.floor(Math.random() * i);
			[arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
		}

		return arr;
	}

	// toCamelCase(str) {
	// 	return str.toLowerCase().replace(/(-|_)([a-z])/g, match => match[1].toUpperCase());
	// }

	/**
	 * Escape special characters in regex
	 * @param {String} str The regex string to escape
	 * @returns {String}
	 */
	regEscape(str) {
		return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	/**
	 * Split a message or message array by a number of characters
	 * @param {String|Array} message The message or array to split
	 * @param {Number} len The length to split it by
	 * @returns {Array} An array of strings
	 */
	splitMessage(message, len) {
		let msgArray = [];

		if (!message) return [];

		if (Array.isArray(message)) {
			message = message.join('\n');
		}

		if (message.length > len) {
			let str = '', pos;
			while (message.length > 0) {
				// split on last newline
				pos = message.length > len ? message.lastIndexOf('\n', len) : message.length;
				// if there's no newlines
				if (pos > len) pos = len;

				// grab the substring, and remove from message
				str = message.substr(0, pos);
				message = message.substr(pos);

				// push to array
				msgArray.push(str);
			}
		} else {
			msgArray.push(message);
		}

		return msgArray;
	}

	clean(str) {
		return str.replace(this.cleanRegex, '\\$&');
	}

	/**
	 * Get the full username and discriminator for a user or member
	 * @param {Member|User} user
	 * @returns {String}
	 */
	fullName(user, escape = true) {
		let username = user.username || user.name,
			discrim = user.discriminator || user.discrim;

		username = this.clean(username);

		if (escape) {
			username.replace(/\\/g, '\\\\').replace(/`/g, `\`${String.fromCharCode(8203)}`);
		}

		return `${username}#${discrim}`;
	}

	/**
	 * Send a message to discord
	 * @param {GuildChannel|PrivateChannel} channel The channel to send to
	 * @param {String} message The message to send
	 * @param {Object} [options={}] Optional options object
	 * @returns {Promise}
	 */
	sendMessage(channel, message, options = {}) {
		if (!channel) return Promise.reject('Channel is undefined or null');
		if (!message) return Promise.reject('Message is undefined or empty.');

		if (this.isArray(message)) message = message.join('\n');

		return channel.createMessage(message).then(msg => {
			if (options.pin) msg.pin();
			if (options.deleteAfter) {
				setTimeout(() => {
					msg.delete().catch(() => false);
				}, options.deleteAfter);
			}
			return msg;
		}).catch(err => err);
	}

	sendCode(channel, message = ' ', lang = '', ...args) {
		return this.sendMessage(channel, '```' + `${lang}\n${message}` + '```', ...args);
	}

	/**
	 * Sort roles by position or id
	 * @param {Array} roles Array of roles to sort
	 * @returns {Array.<Role>}
	 */
	sortRoles(roles) {
		if (!roles || !roles.length) return [];
		return roles
			.sort((r1, r2) => (r1.position !== r2.position) ? r2.position - r1.position : r1.id - r2.id);
	}

	hasRoleHierarchy(guild, clientMember, role) {
		if (!guild || !clientMember) return false;

		for (let r of clientMember.roles) {
			r = guild.roles.get(r);
			if (r.id === role.id) continue;
			if (r.position > role.position) return true;
		}

		return false;
	}

	/**
	 * Replacer method for user entered content
	 * @param {String} content Content to replace
	 * @param {Object} data Object containing guild and user
	 * @param {Boolean} [mentionUser=true] Whether to mention the replaced user or not
	 * @returns {String} The replaced content
	 */
	replacer(content, data, mentionUser = true) {
		return content
			.replace(/{user}/gi, mentionUser ? data.user.mention : this.fullName(data.user))
			.replace(/{user\.([a-zA-Z]+)}/gi, (match, key) => {
				if (!data.user[key]) return '';
				if (typeof data.user[key] !== 'string' || typeof data.user[key] !== 'number') return '';
				if (key === 'name') {
					return this.fullName(data.user);
				}
				if (key === 'discrim') {
					return data.user.discriminator;
				}
				return data.user[key];
			})
			.replace(/{server}/gi, data.guild.name)
			.replace(/{channel}/gi, data.channel.mention)
			.replace(this.channelRegex, (match, name) => {
				let channel = data.guild.channels.find(g => g.name === name);
				return channel ? channel.mention : '';
			})
			.replace(this.roleRegex, (match, name) => {
				let role = data.guild.roles.find(r => r.name === name);
				return role ? role.mention : '';
			})
			.replace(this.userRegex, (match, name) => {
				let user = data.guild.members.find(u => u.username === name);
				return user ? user.mention : '';
			});
	}

	isArray(value) {
		return Object.prototype.toString.call(value) === '[object Array]';
	}

	/**
	 * Convert hex color to integer
	 * @param  {String} color Hex value of color
	 * @returns {Number} Hex color as an integer
	 */
	hexToInt(color) {
		return color.startsWith('#') ? parseInt(color.replace('#', ''), 16) : parseInt(color, 16);
	}

	getColor(color) {
		const result = this.colors[color];
		return result ? result.int : null;
	}

	/**
	 * Method to convert bytes to human readable form
	 * @param   {Number} bytes    Number of bytes
	 * @param   {Number} [decimals] Number of decimals
	 * @returns {String}          Formatted number
	 */
	formatBytes(bytes, decimals) {
		if (bytes === 0) return '0 Byte';
		const k = 1024;
		const dm = decimals || 3;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	/**
	 * Taken from youtube-validate to remove some unnecessary dependencies
	 * @param  {String} url URL to validate
	 * @return {Promise}     Resolves a video id
	 */
	validateYoutube(url) {
		const videoID = '/' + url.split('/').pop();
		const urlLowerCase = url.toLowerCase();
		const urlSpltLowerCase = urlLowerCase.split('/');

		return new Promise((resolve, reject) => {
			if (urlSpltLowerCase.includes('youtube.com') || urlSpltLowerCase.includes('www.youtube.com')) {
				const begin = urlLowerCase.replace('youtube.com', '').replace(videoID.toLowerCase(), '');

				if (!(begin === 'www.' || begin === 'http://www.' || begin === '' || begin === 'https://www.')) {
					reject('URL malformed');
				}
			} else {
				reject('URL malformed');
			}

			if (videoID === '' || videoID === '/') {
				reject('URL malformed');
			}

			resolve(videoID);
		}).then((videoID) => this.youtubeRequest(videoID));
	}

	/**
	 * Taken from youtube-validate to remove some unnecessary dependencies
	 * @param  {String} videoID ID of video
	 * @return {Promise}         Resolves a video id
	 */
	async youtubeRequest(videoID) {
		videoID = videoID.replace('/watch?v=', '');
		return new Promise((resolve, reject) => {
			const options = {
				hostname: 'www.youtube.com',
				port: 80,
				path: '/oembed?url=http://www.youtube.com/watch?v=' + escape(videoID) + '&format=json',
				method: 'HEAD',
				headers: {
					'Content-Type': 'application/json',
				},
			};

			const req = http.request(options, (res) => {
				if (res.statusCode === '404' || res.statusCode === '302') {
					reject('youtube video does not exist');
				} else {
					resolve(videoID);
				}

				req.on('error', () => {
					reject('something bad happened');
				});
			});
			req.shouldKeepAlive = false;
			req.end();
		});
	}
}

module.exports = new Utils();
