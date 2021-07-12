import * as eris from '@dyno.gg/eris';
import Base from './Base';
import CommandData from './CommandData';
import SubCommand from './SubCommand';

interface Command {
	commands?: SubCommand[];
	cooldown?: number;
	defaultCommand?: string;
	disableDM?: boolean;
	[key: string]: any;
}

/**
 * Abstract class for classes that represent a command
 * @abstract Command
 * @extends Base
 */
abstract class Command extends Base {
	public name: string;
	public abstract aliases: string[];
	public abstract description: string;
	public abstract usage: string|string[];
	public abstract example: string|string[];
	public abstract expectedArgs: number;

	private _cooldowns: Map<string, any> = new Map();

	public abstract execute(e: CommandData): Promise<any>;

	/**
	 * Validate class requirements
	 */
	public ensureInterface() {
		// required properties
		if (this.aliases == undefined) {
			throw new Error(`${this.constructor.name} command must define aliases property.`);
		}
		if (this.description == undefined) {
			throw new Error(`${this.constructor.name} command must define description property.`);
		}
		if (this.usage == undefined) {
			throw new Error(`${this.constructor.name} command must define usage property.`);
		}

		// required methods
		if (this.execute == undefined) {
			throw new Error(`${this.constructor.name} command must have an execute method.`);
		}

		// warnings
		if (this.expectedArgs == undefined) {
			this.logger.warn(`${this.constructor.name} should defined the expectedArgs property.`);
		}
		this.expectedArgs = this.expectedArgs || 0;
	}

	/**
	 * Set internal property
	 */
	public setInternal(key: string, value: any) {
		this[key] = value;
	}

	/**
	 * Generates help for the command based on properties defined by the command.
	 * @param {Message} message Message object
	 * @param {Object} guildConfig Guild config
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public help(message: eris.Message, guildConfig: any, subcommand?: SubCommand) {
		const msgArray = [];

		const command: any = subcommand || this;

		if (!command.desc && !command.description) {
			return Promise.resolve();
		}

		const prefix = guildConfig.prefix || '?';
		const name = subcommand ? `${this.name} ${command.name}` : `${command.name}`;

		if (command.aliases && command.aliases.length > 1) {
			msgArray.push(`**Aliases:** ${prefix}${command.aliases.slice(1).join(`, ${prefix}`)}`);
		}

		const description = `**Description:** ${command.desc || command.description}`;

		msgArray.push(description);

		if (command.cooldown) {
			msgArray.push(`**Cooldown:** ${command.cooldown / 1000} seconds`);
		}

		if (command.commands) {
			msgArray.push('**Sub Commands:**');
			for (const cmd of command.commands) {
				if (cmd.default) {
					continue;
				}
				msgArray.push(`\t${prefix}${command.name} ${cmd.name} - ${cmd.desc}`);
			}
		}

		if (command.usage) {
			if (typeof command.usage === 'string') {
				const usage = subcommand ? `${this.name} ${command.usage}` : `${command.usage}`;
				msgArray.push(`**Usage:** ${prefix}${usage}`);
			} else {
				msgArray.push('**Usage:** ');
				for (const use of command.usage) {
					msgArray.push(`\t${prefix}${use}`);
				}
			}
		} else if (command.commands) {
			msgArray.push('**Usage:** ');
			for (const use of command.commands.map((c: SubCommand) => c.usage)) {
				msgArray.push(`\t${prefix}${use}`);
			}
		}

		if (command.example) {
			if (typeof command.example === 'string') {
				const example = subcommand ? `${this.name} ${command.example}` : `${command.example}`;
				msgArray.push(`**Example:** ${prefix}${example}`);
			} else {
				msgArray.push('**Example:**');
				for (const ex of command.example) {
					msgArray.push(`\t${prefix}${ex}`);
				}
			}
		}

		const embed = {
			title: `**Command:** ${prefix}${name}`,
			description: msgArray.join('\n'),
		};

		return this.sendMessage(message.channel, { embed });
	}

	public shouldCooldown(message: eris.Message): any {
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
	public _execute(e: CommandData): Promise<any> {
		const { message, args, command, guildConfig } = e;

		e.t = (key: string, values: any[]) => {
			return this.t(guildConfig, key, values);
		};

		if (e.responseChannel) {
			this.responseChannel = e.responseChannel;
		}

		this.suppressOutput = e.suppressOutput || false;

		if (this.disableDM && !(<eris.GuildChannel>message.channel).guild) {
			return this.sendMessage(message.channel, `This command doesn't work in DM`);
		}

		if ((this.expectedArgs && args.length < this.expectedArgs) || (args && args[0] === 'help')) {
			if (this.permissions === 'admin' && (!e.isAdmin || !e.isOverseer)) {
				return Promise.resolve();
			}
			return this.help(message, guildConfig);
		}

		if (!e.isAdmin && !e.isOverseer) {
			const cooldown = this.shouldCooldown(message);
			if (cooldown) {
				return cooldown.suppress ? Promise.reject(null) :
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
				const subcommand = this.commands.find((c: SubCommand) => typeof c === 'object' ? c.name === args[0] : c === args[0]);
				if (subcommand) {
					// ignore disabled subcommand
					if (guildConfig.subcommands && guildConfig.subcommands[this.name] &&
						guildConfig.subcommands[this.name][subcommand.name] === false) {
							return Promise.resolve();
					}

					if (args[1] && args[1] === 'help') {
						return this.help(message, guildConfig, subcommand);
					}

					return this[args[0]]({ message, args: args.slice(1), guildConfig, t: e.t }).then(() => {
						if (!this._cooldowns.has(message.author.id)) {
							this._cooldowns.set(message.author.id, { time: Date.now() });
						}
					});
				}
			}

			if (this.defaultCommand) {
				// ignore disabled subcommand
				if (guildConfig.subcommands && guildConfig.subcommands[this.name] &&
					guildConfig.subcommands[this.name][this.defaultCommand] === false) {
						return Promise.resolve();
				}

				return this[this.defaultCommand]({ message, args, guildConfig, t: e.t }).then(() => {
					if (!this._cooldowns.has(message.author.id)) {
						this._cooldowns.set(message.author.id, { time: Date.now() });
					}
				});
			}
		});
	}

	/**
	 * Logs the command to the database
	 */
	protected log(message: eris.Message, command: string, writeLog?: boolean) {
		if (writeLog) {
			// tslint:disable-next-line
			this.logger.info(`[Comamand] Server: ${(<eris.GuildChannel>message.channel).guild.id}, Channel: ${message.channel.id}, User: ${message.author.username} (${message.author.id}) ${message.cleanContent}`);
		}

		const doc = {
			server: (<eris.GuildChannel>message.channel).guild.id,
			user: {
				id: message.author.id,
				name: message.author.username,
				discrim: message.author.discriminator,
			},
			command: command,
			message: message.cleanContent,
		};

		const log = new this.models.CommandLog(doc);
		log.save((err: string) => err ? this.logger.error(err) : false);
	}
}

export default Command;
