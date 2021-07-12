'use strict';

const Command = Loader.require('./core/structures/Command');

class IgnoreUser extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['ignoreuser'];
		this.group        = 'Manager';
		this.description  = 'Toggles command usage for a user.';
		this.usage        = 'ignoreuser [user]';
		this.permissions  = 'serverAdmin';
		this.overseerEnabled = true;
		this.disableDM    = true;
		this.expectedArgs = 1;
	}

	execute({ message, args, guildConfig }) {
		const user = this.resolveUser(message.guild, args[0]);
		if (!user) {
			return this.error(message.channel, `I couldn't find that user`);
		}

		if (this.isServerMod(user, message.channel)) {
			return this.error(message.channel, `That user is a mod or admin.`);
		}

		guildConfig.ignoredUsers = guildConfig.ignoredUsers || [];
		const index = guildConfig.ignoredUsers.findIndex(u => u.id === user.id);
		if (index > -1) {
			guildConfig.ignoredUsers.splice(index, 1);
		} else {
			guildConfig.ignoredUsers.push({
				id: user.id,
				username: user.username,
				discriminator: user.discriminator,
			});
		}

		return this.dyno.guilds.update(message.guild.id, { $set: { 'ignoredUsers': guildConfig.ignoredUsers } })
			.then(() => this.success(message.channel, index > -1 ?
				`Removed ${this.utils.fullName(user)} from ignored users. Commands can be used again.` :
				`Added ${this.utils.fullName(user)} to ignored users. Commands will no longer be usable.`))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}

module.exports = IgnoreUser;
