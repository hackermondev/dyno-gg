'use strict';

const Base = requireReload(require)('./Base');
const { CommandLog } = require('../../core/models');

/**
 * Abstract class for classes that represent a command
 * @abstract Command
 */
class Command extends Base {
	/**
	 * Command constructor
	 * @param {Object} config The Dyno configuration
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor() {
		super();
		if (new.target === Command) throw new TypeError('Cannot construct Command instances directly.');

		this._cooldowns = new Map();
	}

	/**
	 * Validate class requirements
	 */
	ensureInterface() {
		// required properties
		if (typeof this.aliases === 'undefined')
			throw new Error(`${this.constructor.name} command must define aliases property.`);
		if (typeof this.description === 'undefined')
			throw new Error(`${this.constructor.name} command must define description property.`);
		if (typeof this.usage === 'undefined')
			throw new Error(`${this.constructor.name} command must define usage property.`);

		// required methods
		if (typeof this.execute === 'undefined')
			throw new Error(`${this.constructor.name} command must have an execute method.`);

		// warnings
		if (typeof this.expectedArgs === 'undefined')
			this.logger.warn(`${this.constructor.name} should defined the expectedArgs property.`);
		this.expectedArgs = this.expectedArgs || 0;
	}

	/**
	 * Set internal property
	 * @param {String} key Name of property
	 * @param {Mixed} value Value of property
	 */
	setInternal(key, value) {
		this[key] = value;
	}

	/**
	 * Generates help for the command based on properties defined by the command.
	 * @param {Message} message Message object
	 * @param {String} command command name
	 */
	help(message, guildConfig) {
		let msgArray = [];

		if (!this.description) {
			return Promise.resolve();
		}

		const prefix = guildConfig.prefix || '?';

		if (this.aliases.length > 1) {
			msgArray.push(`**Aliases:** ${prefix}${this.aliases.slice(1).join(`, ${prefix}`)}`);
		}

		let description = `**Description:** ${this.description}`;

		// if (this.commands) {
		// 	description += ` has sub commands, type ?help ${this.name} for more`;
		// }

		msgArray.push(description);

		if (this.commands) {
			msgArray.push('**Sub Commands:**');
			for (const cmd of this.commands) {
				msgArray.push(`\t${prefix}${this.name} ${cmd.name} - ${cmd.desc}`);
			}
		}

		if (this.usage) {
			if (typeof this.usage === 'string') {
				msgArray.push(`**Usage:** ${prefix}${this.usage}`);
			} else {
				msgArray.push('**Usage:** ');
				for (const use of this.usage) {
					msgArray.push(`\t${prefix}${use}`);
				}
			}
		} else if (this.commands) {
			msgArray.push('**Usage:** ');
			for (const use of this.commands.map(c => c.usage)) {
				msgArray.push(`\t${prefix}${use}`);
			}
		}

		if (this.example) {
			if (typeof this.example === 'string') {
				msgArray.push(`**Example:** ${prefix}${this.example}`);
			} else {
				msgArray.push('**Example:**');
				for (const ex of this.example) {
					msgArray.push(`\t${prefix}${ex}`);
				}
			}
		}

		const embed = {
			title: `**Command:** ${prefix}${this.name}`,
			description: msgArray.join('\n'),
		};

		return this.sendMessage(message.channel, { embed });
	}

	shouldCooldown(message) {
		const cooldown = this._cooldowns.get(message.author.id);
		if (!cooldown) {
			return false;
		}

		if (Date.now() - cooldown.time < this.cooldown) {
			return cooldown;
		}

		this._cooldowns.delete(message.author.id);
		return false;
	}

	/**
	 * Execute a command
	 * @param {Object} message message object
	 * @param {Array} args command arguments
	 * @param {String} command command name
	 * @returns {Promise}
	 */
	_execute(e) {
		const { message, args, command } = e;

		if (e.responseChannel) {
			this.responseChannel = e.responseChannel;
		}

		this.suppressOutput = e.suppressOutput || false;

		if (this.disableDM && !message.channel.guild) {
			return this.sendMessage(message.channel, `This command doesn't work in DM`);
		}

		if ((this.expectedArgs && args.length < this.expectedArgs) || (args && args[0] === 'help')) {
			return this.help(message, e.guildConfig);
		}

		if (!e.isAdmin && !e.isOverseer) {
			const cooldown = this.shouldCooldown(message);
			if (cooldown) {
				return cooldown.suppress ? Promise.reject() :
					this.sendMessage(message.channel, `${message.author.mention}, a little too quick there.`, { deleteAfter: 9000 })
						.then(() => {
							cooldown.suppress = true;
						});
			}
		}

		this.log(message, command, this.config.logCommands || null);

		if (!this.commands) {
			return this.execute(e).then(() => {
				if (!this._cooldowns.has(message.author.id)) {
					this._cooldowns.set(message.author.id, { time: Date.now() });
				}
			});
		}

		return this.execute(e).then(() => {
			if (this.commands) {
				const subcommand = this.commands.find(c => typeof c === 'object' ? c.name === args[0] : c === args[0]);
				if (subcommand) {
					// ignore disabled subcommand
					if (e.guildConfig.subcommands && e.guildConfig.subcommands[this.name] &&
						e.guildConfig.subcommands[this.name][subcommand.name] === false) return Promise.resolve();

					return this[args[0]](message, args.slice(1), e.guildConfig).then(() => {
						if (!this._cooldowns.has(message.author.id)) {
							this._cooldowns.set(message.author.id, { time: Date.now() });
						}
					});
				}
			}

			if (this.defaultCommand) {
				// ignore disabled subcommand
				if (e.guildConfig.subcommands && e.guildConfig.subcommands[this.name] &&
						e.guildConfig.subcommands[this.name][this.defaultCommand] === false) return Promise.resolve();

				return this[this.defaultCommand](message, args, e.guildConfig).then(() => {
					if (!this._cooldowns.has(message.author.id)) {
						this._cooldowns.set(message.author.id, { time: Date.now() });
					}
				});
			}
		});
	}

	/**
	 * Logs the command to the database
	 * @param {Object} message Message Object
	 * @param {String} command Command name to log
	 * @param {Boolean} writeLog Whether to write log to console/file
	 * @returns {void}
	 */
	log(message, command, writeLog) {
		if (writeLog) {
			this.logger.info(`[Comamand] Server: ${message.channel.guild.id}, Channel: ${message.channel.id}, User: ${message.author.username} (${message.author.id}) ${message.cleanContent}`); // eslint-disable-line
		}

		let doc = {
			server: message.channel.guild.id,
			user: {
				id: message.author.id,
				name: message.author.username,
				discrim: message.author.discriminator,
			},
			command: command,
			message: message.cleanContent,
		};

		let log = new CommandLog(doc);
		log.save(err => err ? this.logger.error(err) : false);
	}
}

module.exports = Command;
