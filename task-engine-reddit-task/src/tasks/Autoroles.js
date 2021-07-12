const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const logger = require('../logger')('Automessage', 'automessage');

class Autoroles extends Task {
    constructor() {
        super();

        logger.info('Starting Autoroles Task.');
    }

    async applyRoles() {
		try {
            var autoroles = await this.models.Autorole.find().lean();
        } catch (err) {
            return logger.error(err);
        }

		this.asyncForEach([...this.autoroles.values()], async (data) => {
            const duration = moment().diff(moment(data.createdAt), 'minutes');
            if (duration < data.duration) {
                return;
            }

            const guildConfig = await this.models.Server.findOne({ _id: doc.guild }).catch(() => null);
            if (!guildConfig.modules.Autoroles || guildConfig.modules.Autoroles === false || !guildConfig.autoroles) {
                return this.deleteAutorole(data);
            }

            if (!guildConfig.autoroles.roleOnJoin && (!guildConfig.autoroles.autoroles || !guildConfig.autoroles.autoroles.length)) {
                return this.deleteAutorole(data);
            }

            try {
                var [guild, member] = await Promise.all([
                    this.client.getRESTGuild(data.guild),
                    this.client.getRESTGuildMember(data.guild, data.user),
                ]);
            } catch (err) {
                return logger.error(err);
            }

            // const guild = this.client.guilds.get(data.guild);

			// if (!guild || duration < data.duration) {
			// 	return;
			// }

			// const member = guild.members.get(data.user);
			// if (!member) {
			// 	return this.deleteAutorole(data);
			// }

			// if (!await this.isEnabled(guild, this)) {
			// 	return;
			// }

			if (data.type === 'add' && member.roles.includes(data.role)) {
				return this.deleteAutorole(data);
			}

			if (data.type === 'remove' && !member.roles.includes(data.role)) {
				return this.deleteAutorole(data);
			}

			let missingRoles = false;
			if (!this.hasPermissions(guild, 'manageRoles')) {
				missingRoles = true;
			}

			const role = guild.roles.get(data.role);
			if (!role || !this.hasRoleHierarchy(guild, role)) {
				this.statsd.increment(`autoroles.add.error`);
				return this.deleteAutorole(data);
			}

			if (data.type === 'add') {
				this.client.addGuildMemberRole(guild.id, member.id, data.role, `Dyno Autorole`)
					.then(() => {
						this.statsd.increment(`autoroles.add.success`);
						return this.deleteAutorole(data);
					})
					.catch(() => {
						this.statsd.increment(`autoroles.add.error`);
						if (missingRoles) {
							return this.deleteAutorole(data);
						}
					});
			} else if (data.type === 'remove') {
				this.client.removeGuildMemberRole(guild.id, member.id, data.role, `Dyno Autorole`)
					.then(() => {
						this.statsd.increment(`autoroles.add.success`);
						return this.deleteAutorole(data);
					})
					.catch(() => {
						this.statsd.increment(`autoroles.add.error`);
						if (missingRoles) {
							return this.deleteAutorole(data);
						}
					});
			}
		});
	}
}