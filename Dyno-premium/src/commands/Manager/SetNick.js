'use strict';

const Command = Loader.require('./core/structures/Command');

class SetNick extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['setnick'];
        this.group        = 'Manager';
        this.description  = 'Change the nickname of a user.';
        this.usage        = 'setnick [user] [new nickname]';
        this.permissions  = 'serverAdmin';
        this.expectedArgs = 2;
        this.disableDM    = true;
        this.requiredPermissions = ['changeNickname'];
    }

    async execute({ message, args }) {
        const member = this.resolveUser(message.channel.guild, args[0]);

        if (!member) {
            return this.error(message.channel, `Couldn't find that user.`);
        }

        const nick = args.length > 1 ? args.slice(1).join(' ') : null;
        // member = message.channel.guild.members.get(this.client.user.id);

        try {
            await this.client.editGuildMember(message.channel.guild.id, member.id, { nick });
        } catch (err) {
            return this.error(message.channel, `Unable to change nickname for ${this.utils.fullName(member)}.`, err);
        }

        return this.success(message.channel, 'Nickname changed.');
    }
}

module.exports = SetNick;
