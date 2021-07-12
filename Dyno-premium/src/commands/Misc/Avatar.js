'use strict';

const Command = Loader.require('./core/structures/Command');
const utils = Loader.require('./core/utils');

class Avatar extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['avatar', 'av'];
        this.group        = 'Misc';
        this.description  = `Get a users' avatar.`;
        this.usage        = 'avatar [user]';
        this.expectedArgs = 0;
        this.cooldown     = 3000;
    }

    execute({ message, args }) {
        let user = args.length ? this.resolveUser(message.channel.guild, args[0]) : message.author;

        if (!user) {
            return this.error(message.channel, `Couldn't find that user.`);
        }

        user = user.user || user;

        return this.sendMessage(message.channel, { embed: {
            author: {
                name: utils.fullName(user),
                icon_url: user.dynamicAvatarURL(null, 32),
            },
            title: 'Avatar',
            image: { url: user.dynamicAvatarURL(null, 128), width: 128, height: 128 },
        } });
    }
}

module.exports = Avatar;
