"use strict";

const Collection = require("../util/Collection");
const GuildChannel = require("./GuildChannel");
const Member = require("./Member");

/**
* Represents a guild voice channel
* @extends GuildChannel
* @prop {String} id The ID of the channel
* @prop {String} mention A string that mentions the channel
* @prop {Number} type The type of the channel
* @prop {Guild} guild The guild that owns the channel
* @prop {String?} parentID The ID of the category this channel belongs to
* @prop {String} name The name of the channel
* @prop {Number} position The position of the channel
* @prop {Boolean} nsfw Whether the channel is an NSFW channel or not
* @prop {Collection<PermissionOverwrite>} permissionOverwrites Collection of PermissionOverwrites in this channel
* @prop {Number?} bitrate The bitrate of the channel
* @prop {Number?} userLimit The max number of users that can join the channel
* @prop {Collection<Member>} voiceMembers Collection of Members in this channel
*/
class VoiceChannel extends GuildChannel {
    constructor(data, client) {
        super(data, client);
        this.voiceMembers = new Collection(Member);
        this.update(data);
    }

    update(data) {
        super.update(data);

        // if(data.bitrate !== undefined) {
        //     this.bitrate = data.bitrate;
        // }
        // if(data.user_limit !== undefined) {
        //     this.userLimit = data.user_limit;
        // }
    }

    /**
    * Get all invites in the channel
    * @returns {Promise<Invite[]>}
    */
    getInvites() {
        return this.client.getChannelInvites.call(this.client, this.id);
    }

    /**
    * Create an invite for the channel
    * @arg {Object} [options] Invite generation options
    * @arg {Number} [options.maxAge] How long the invite should last in seconds
    * @arg {Number} [options.maxUses] How many uses the invite should last for
    * @arg {Boolean} [options.temporary] Whether the invite grants temporary membership or not
    * @arg {Boolean} [options.unique] Whether the invite is unique or not
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Invite>}
    */
    createInvite(options, reason) {
        return this.client.createChannelInvite.call(this.client, this.id, options, reason);
    }

    /**
    * Joins the channel.
    * @arg {Object} [options] VoiceConnection constructor options
    * @arg {Object} [options.shared] Whether the VoiceConnection will be part of a SharedStream or not
    * @arg {Object} [options.opusOnly] Skip opus encoder initialization. You should not enable this unless you know what you are doing
    * @returns {Promise<VoiceConnection>} Resolves with a VoiceConnection
    */
    join(options) {
        return this.client.joinVoiceChannel.call(this.client, this.id, options);
    }

    /**
    * Leaves the channel.
    */
    leave() {
        return this.client.leaveVoiceChannel.call(this.client, this.id);
    }

    toJSON(props = []) {
        return super.toJSON([
            "bitrate",
            "userLimit",
            "voiceMembers",
            ...props
        ]);
    }
}

module.exports = VoiceChannel;
