"use strict";

const Base = require("./Base");
const Channel = require("./Channel");
const Endpoints = require("../rest/Endpoints");
const Collection = require("../util/Collection");
const GuildChannel = require("./GuildChannel");
const Member = require("./Member");
const Role = require("./Role");
const VoiceState = require("./VoiceState");

/**
* Represents a guild
* @prop {String} id The ID of the guild
* @prop {Number} createdAt Timestamp of the guild's creation
* @prop {String} name The name of the guild
* @prop {Number} verificationLevel The guild verification level
* @prop {String} region The region of the guild
* @prop {String?} icon The hash of the guild icon, or null if no icon
* @prop {String?} afkChannelID The ID of the AFK voice channel
* @prop {Number} afkTimeout The AFK timeout in seconds
* @prop {Number} defaultNotifications The default notification settings for the guild. 0 is "All Messages", 1 is "Only @mentions"
* @prop {Number} mfaLevel The admin 2FA level for the guild. 0 is not required, 1 is required
* @prop {Number} joinedAt Timestamp of when the bot account joined the guild
* @prop {String} ownerID The ID of the user that is the guild owner
* @prop {String?} systemChannelID The ID of the default channel for system messages (built-in join messages)
* @prop {String?} splash The hash of the guild splash image, or null if no splash (VIP only)
* @prop {String?} banner The hash of the guild banner image, or null if no banner (VIP only)
* @prop {Boolean} unavailable Whether the guild is unavailable or not
* @prop {Boolean} large Whether the guild is "large" by "some Discord standard"
* @prop {Number} maxPresences The maximum number of people that can be online in a guild at once (returned from REST API only)
* @prop {Collection<VoiceState>} voiceStates Collection of voice states in the guild
* @prop {Collection<GuildChannel>} channels Collection of Channels in the guild
* @prop {Collection<Member>} members Collection of Members in the guild
* @prop {Number} memberCount Number of members in the guild
* @prop {Collection<Role>} roles Collection of Roles in the guild
* @prop {Shard} shard The Shard that owns the guild
* @prop {String[]} features An array of guild feature strings
* @prop {Object[]} emojis An array of guild emoji objects
* @prop {String?} iconURL The URL of the guild's icon
* @prop {Number} explicitContentFilter The explicit content filter level for the guild. 0 is off, 1 is on for people without roles, 2 is on for all
* @prop {Number} premiumTier Nitro boost level of the guild
* @prop {Number?} premiumSubscriptionCount The total number of users currently boosting this guild
* @prop {String?} vanityURL The vanity URL of the guild (VIP only)
* @prop {String} preferredLocale Preferred guild language
* @prop {String?} description The description for the guild (VIP only)
* @prop {Number} maxMembers The maximum amount of members for the guild
*/
class Guild extends Base {
    constructor(data, client) {
        super(data.id);
        this._client = client;
        this.shard = client.shards.get(client.guildShardMap[this.id]);
        this.unavailable = !!data.unavailable;

        if (data.inactive) {
            this.inactive = true;
        }

        this.memberCount = data.member_count;

        if (data.lastActive) {
            this.lastActive = data.lastActive;
        }

        if (this.inactive) {
            if (data.members) {
                this.members = new Collection(Member);

                const selfId = client.user.id;
                const selfMember = data.members.find(m => m.id === selfId);

                if (selfMember) {
                    this.members.add(selfMember, this);
                }
            }
            return;
        }

        this.joinedAt = Date.parse(data.joined_at);
        this.voiceStates = new Collection(VoiceState);
        this.channels = new Collection(GuildChannel);
        this.members = new Collection(Member);
        this.roles = new Collection(Role);

        if(data.roles) {
            for(const role of data.roles) {
                this.roles.add(role, this);
            }
        }

        if(data.channels) {
            for(const channelData of data.channels) {
                channelData.guild_id = this.id;
                const channel = Channel.from(channelData, client);
                channel.guild = this;
                this.channels.add(channel, client);
                client.channelGuildMap[channel.id] = this.id;
            }
        }

        if(data.members) {
            for(const member of data.members) {
                member.id = member.user.id;
                this.members.add(member, this);
            }
        }

        if(data.presences) {
            for(const presence of data.presences) {
                if(!this.members.get(presence.user.id)) {
                    let userData = client.users.get(presence.user.id);
                    if(userData) {
                        userData = `{username: ${userData.username}, id: ${userData.id}, discriminator: ${userData.discriminator}}`;
                    }
                    client.emit("debug", `Presence without member. ${presence.user.id}. In global user cache: ${userData}. ` + JSON.stringify(presence), this.shard.id);
                    continue;
                }
                presence.id = presence.user.id;
                this.members.update(presence);
            }
        }

        if(data.voice_states) {
            if(!client.bot) {
                this.pendingVoiceStates = data.voice_states;
            } else {
                for(const voiceState of data.voice_states) {
                    if(!this.members.get(voiceState.user_id)) {
                        continue;
                    }
                    voiceState.id = voiceState.user_id;
                    try {
                        this.channels.get(voiceState.channel_id).voiceMembers.add(this.members.update(voiceState));
                    } catch(err) {
                        client.emit("error", err, this.shard.id);
                        continue;
                    }
                    if(client.options.seedVoiceConnections && voiceState.id === client.user.id && !client.voiceConnections.get(this.id)) {
                        process.nextTick(() => this._client.joinVoiceChannel(voiceState.channel_id));
                    }
                }
            }
        }
        this.update(data);
    }

    update(data) {
        if(data.name !== undefined) {
            this.name = data.name;
        }
        // if(data.verification_level !== undefined) {
        //     this.verificationLevel = data.verification_level;
        // }
        // if(data.splash !== undefined) {
        //     this.splash = data.splash;
        // }
        // if(data.banner !== undefined) {
        //     this.banner = data.banner;
        // }
        if(data.region !== undefined) {
            this.region = data.region;
        }
        if(data.owner_id !== undefined) {
            this.ownerID = data.owner_id;
        }
        if(data.icon !== undefined) {
            this.icon = data.icon;
        }
        // if(data.features !== undefined) {
        //     this.features = data.features;
        // }
        if(data.emojis !== undefined) {
            this.emojis = data.emojis;
        }
        // if(data.afk_channel_id !== undefined) {
        //     this.afkChannelID = data.afk_channel_id;
        // }
        // if(data.afk_timeout !== undefined) {
        //     this.afkTimeout = data.afk_timeout;
        // }
        // if(data.default_message_notifications !== undefined) {
        //     this.defaultNotifications = data.default_message_notifications;
        // }
        // if(data.mfa_level !== undefined) {
        //     this.mfaLevel = data.mfa_level;
        // }
        // if(data.large !== undefined) {
        //     this.large = data.large;
        // }
        // if(data.max_presences !== undefined) {
        //     this.maxPresences = data.max_presences;
        // }
        // if(data.explicit_content_filter !== undefined) {
        //     this.explicitContentFilter = data.explicit_content_filter;
        // }
        // if(data.system_channel_id !== undefined) {
        //     this.systemChannelID = data.system_channel_id;
        // }
        // if(data.premium_tier !== undefined) {
        //     this.premiumTier = data.premium_tier;
        // }
        // if(data.premium_subscription_count !== undefined) {
        //     this.premiumSubscriptionCount = data.premium_subscription_count;
        // }
        // if(data.vanity_url_code !== undefined) {
        //     this.vanityURL = data.vanity_url_code;
        // }
        // if(data.preferred_locale !== undefined) {
        //     this.preferredLocale = data.preferred_locale;
        // }
        // if(data.description !== undefined) {
        //     this.description = data.description;
        // }
        // if(data.max_members !== undefined) {
        //     this.maxMembers = data.max_members;
        // }
    }

    /**
    * Request all guild members from Discord
    * @arg {Number} [timeout] The number of milliseconds to wait before resolving early. Defaults to the `requestTimeout` client option
    * @returns {Promise<Number>} Resolves with the total number of fetched members.
    */
    fetchAllMembers(timeout) {
        return this.shard.getGuildMembers(this.id, Math.ceil(this.memberCount / 1000), timeout);
    }

    get iconURL() {
        return this.icon ? this._client._formatImage(Endpoints.GUILD_ICON(this.id, this.icon)) : null;
    }

    /**
    * Get the guild's icon with the given format and size
    * @arg {String} [format] The filetype of the icon ("jpg", "png", "gif", or "webp")
    * @arg {Number} [size] The size of the icon (any power of two between 16 and 2048)
    */
    dynamicIconURL(format, size) {
        return this.icon ? this._client._formatImage(Endpoints.GUILD_ICON(this.id, this.icon), format, size) : null;
    }

    get splashURL() {
        return this.splash ? this._client._formatImage(Endpoints.GUILD_SPLASH(this.id, this.splash)) : null;
    }

    get bannerURL() {
        return this.banner ? this._client._formatImage(Endpoints.GUILD_BANNER(this.id, this.banner)) : null;
    }

    /**
    * Get the guild's splash with the given format and size
    * @arg {String} [format] The filetype of the icon ("jpg", "png", "gif", or "webp")
    * @param {Number} [size] The size of the icon (any power of two between 16 and 2048)
    */
    dynamicSplashURL(format, size) {
        return this.splash ? this._client._formatImage(Endpoints.GUILD_SPLASH(this.id, this.splash), format, size) : null;
    }

    /**
    * Get the guild's banner with the given format and size
    * @arg {String} [format] The filetype of the icon ("jpg", "png", "gif", or "webp")
    * @param {Number} [size] The size of the icon (any power of two between 16 and 2048)
    */
    dynamicBannerURL(format, size) {
        return this.banner ? this._client._formatImage(Endpoints.GUILD_BANNER(this.id, this.banner), format, size) : null;
    }

    /**
    * Create a channel in the guild
    * @arg {String} name The name of the channel
    * @arg {Number} [type=0] The type of the channel, either 0 (text), 2 (voice), or 4 (category)
    * @arg {Object | String} [options] The properties the channel should have. If `options` is a string, it will be treated as `options.parentID` (see below). Passing a string is deprecated and will not be supported in future versions.
    * @arg {String} [options.topic] The topic of the channel (text channels only)
    * @arg {Boolean} [options.nsfw] The nsfw status of the channel
    * @arg {Number} [options.bitrate] The bitrate of the channel (voice channels only)
    * @arg {String?} [options.parentID] The ID of the parent category channel for this channel
    * @arg {Array} [options.permissionOverwrites] An array containing permission overwrite objects
    * @arg {Number} [options.rateLimitPerUser] The time in seconds a user has to wait before sending another message (does not affect bots or users with manageMessages/manageChannel permissions) (text channels only)
    * @arg {String} [options.reason] The reason to be displayed in audit logs
    * @arg {Number} [options.userLimit] The channel user limit (voice channels only)
    * @returns {Promise<CategoryChannel | TextChannel | VoiceChannel>}
    */
    createChannel(name, type, reason, options) {
        return this._client.createChannel.call(this._client, this.id, name, type, reason, options);
    }

    /**
    * Create a emoji in the guild
    * @arg {Object} options Emoji options
    * @arg {String} options.name The name of emoji
    * @arg {String} options.image The base 64 encoded string
    * @arg {Array} [options.roles] An array containing authorized role IDs
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Object>} A guild emoji object
    */
    createEmoji(options, reason) {
        return this._client.createGuildEmoji.call(this._client, this.id, options, reason);
    }

    /**
    * Edit a emoji in the guild
    * @arg {String} emojiID The ID of the emoji you want to modify
    * @arg {Object} options Emoji options
    * @arg {String} [options.name] The name of emoji
    * @arg {Array} [options.roles] An array containing authorized role IDs
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Object>} A guild emoji object
    */
    editEmoji(emojiID, options, reason) {
        return this._client.editGuildEmoji.call(this._client, this.id, emojiID, options, reason);
    }

    /**
    * Delete a emoji in the guild
    * @arg {String} emojiID The ID of the emoji
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    deleteEmoji(emojiID, reason) {
        return this._client.deleteGuildEmoji.call(this._client, this.id, emojiID, reason);
    }

    /**
    * Create a guild role
    * @arg {Object} [options] The properties to set
    * @arg {String} [options.name] The name of the role
    * @arg {Number} [options.permissions] The role permissions number
    * @arg {Number} [options.color] The hex color of the role, in number form (ex: 0x3d15b3 or 4040115)
    * @arg {Boolean} [options.hoist] Whether to hoist the role in the user list or not
    * @arg {Boolean} [options.mentionable] Whether the role is mentionable or not
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Role>}
    */
    createRole(options, reason) {
        return this._client.createRole.call(this._client, this.id, options, reason);
    }

    /**
    * Get the prune count for the guild
    * @arg {Number} days The number of days of inactivity to prune for
    * @returns {Promise<Number>} Resolves with the number of users that would be pruned
    */
    getPruneCount(days) {
        return this._client.getPruneCount.call(this._client, this.id, days);
    }

    /**
    * Begin pruning the guild
    * @arg {Number} days The number of days of inactivity to prune for
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Number>} Resolves with the number of pruned users
    */
    pruneMembers(days, reason) {
        return this._client.pruneMembers.call(this._client, this.id, days, reason);
    }

    /**
    * Get a guild's channels via the REST API. REST mode is required to use this endpoint.
    * @returns {Promise<(CategoryChannel[] | TextChannel[] | VoiceChannel[])>}
    */
    getRESTChannels() {
        return this._client.getRESTGuildChannels.call(this._client, this.id);
    }

    /**
    * Get a guild's emojis via the REST API. REST mode is required to use this endpoint.
    * @returns {Promise<Object[]>} An array of guild emoji objects
    */
    getRESTEmojis() {
        return this._client.getRESTGuildEmojis.call(this._client, this.id);
    }

    /**
    * Get a guild emoji via the REST API. REST mode is required to use this endpoint.
    * @arg {String} emojiID The ID of the emoji
    * @returns {Promise<Object>} An emoji object
    */
    getRESTEmoji(emojiID) {
        return this._client.getRESTGuildEmoji.call(this._client, this.id, emojiID);
    }

    /**
    * Get a guild's members via the REST API. REST mode is required to use this endpoint.
    * @arg {Number} [limit=1] The max number of members to get (1 to 1000)
    * @arg {String} [after] The highest user ID of the previous page
    * @returns {Promise<Member[]>}
    */
    getRESTMembers(limit, after) {
        return this._client.getRESTGuildMembers.call(this._client, this.id, limit, after);
    }

    /**
    * Get a guild's members via the REST API. REST mode is required to use this endpoint.
    * @arg {String} memberID The ID of the member
    * @returns {Promise<Member>}
    */
    getRESTMember(memberID) {
        return this._client.getRESTGuildMember.call(this._client, this.id, memberID);
    }

    /**
    * Get a guild's roles via the REST API. REST mode is required to use this endpoint.
    * @returns {Promise<Role[]>}
    */
    getRESTRoles() {
        return this._client.getRESTGuildRoles.call(this._client, this.id);
    }

    /**
    * Get a guild's embed object
    * @returns {Promise<Object>} A guild embed object
    */
    getEmbed() {
        return this._client.getGuildEmbed.call(this._client, this.id);
    }

    /**
    * Get possible voice regions for a guild
    * @returns {Promise<Object[]>} Resolves with an array of voice region objects
    */
    getVoiceRegions() {
        return this._client.getVoiceRegions.call(this._client, this.id);
    }

    /**
    * Leaves the voice channel in this guild
    */
    leaveVoiceChannel() {
        this._client.closeVoiceConnection.call(this._client, this.id);
    }

    /**
    * Edit the guild role
    * @arg {String} roleID The ID of the role
    * @arg {Object} options The properties to edit
    * @arg {String} [options.name] The name of the role
    * @arg {Number} [options.permissions] The role permissions number
    * @arg {Number} [options.color] The hex color of the role, in number form (ex: 0x3da5b3 or 4040115)
    * @arg {Boolean} [options.hoist] Whether to hoist the role in the user list or not
    * @arg {Boolean} [options.mentionable] Whether the role is mentionable or not
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Role>}
    */
    editRole(roleID, options, reason) {
        return this._client.editRole.call(this._client, this.id, roleID, options, reason);
    }

    /**
    * Delete a role
    * @arg {String} roleID The ID of the role
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    deleteRole(roleID, reason) {
        return this._client.deleteRole.call(this._client, this.id, roleID, reason);
    }

    /**
    * Get the audit logs for a guild
    * @arg {Number} [limit=50] The maximum number of entries to return
    * @arg {String} [before] Get entries before this entry ID
    * @arg {Number} [actionType] Filter entries by action type
    * @returns {Promise<Object>} Resolves with an Object containing `users` and `audit_log_entries` keys
    */
    getAuditLogs(limit, before, actionType) {
        return this._client.getGuildAuditLogs.call(this._client, this.id, limit, before, actionType);
    }

    /**
    * Get a list of integrations for the guild
    * @returns {Promise<GuildIntegration[]>}
    */
    getIntegrations() {
        return this._client.getGuildIntegrations.call(this._client, this.id);
    }

    /**
    * Edit a guild integration
    * @arg {String} integrationID The ID of the integration
    * @arg {Object} options The properties to edit
    * @arg {String} [options.expireBehavior] What to do when a user's subscription runs out
    * @arg {String} [options.expireGracePeriod] How long before the integration's role is removed from an unsubscribed user
    * @arg {String} [options.enableEmoticons] Whether to enable integration emoticons or not
    * @returns {Promise}
    */
    editIntegration(integrationID, options) {
        return this._client.editGuildIntegration.call(this._client, this.id, integrationID, options);
    }

    /**
    * Force a guild integration to sync
    * @arg {String} integrationID The ID of the integration
    * @returns {Promise}
    */
    syncIntegration(integrationID) {
        return this._client.syncGuildIntegration.call(this._client, this.id, integrationID);
    }

    /**
    * Delete a guild integration
    * @arg {String} integrationID The ID of the integration
    * @returns {Promise}
    */
    deleteIntegration(integrationID) {
        return this._client.deleteGuildIntegration.call(this._client, this.id, integrationID);
    }

    /**
    * Get all invites in the guild
    * @returns {Promise<Invite[]>}
    */
    getInvites() {
        return this._client.getGuildInvites.call(this._client, this.id);
    }

    /**
    * Returns the vanity url of the guild
    * @returns {Promise}
    */
    getVanity() {
        return this._client.getGuildVanity.call(this._client, this.id);
    }

    /**
    * Edit a guild member
    * @arg {String} memberID The ID of the member
    * @arg {Object} options The properties to edit
    * @arg {String[]} [options.roles] The array of role IDs the member should have
    * @arg {String} [options.nick] Set the member's guild nickname, "" to remove
    * @arg {Boolean} [options.mute] Server mute the member
    * @arg {Boolean} [options.deaf] Server deafen the member
    * @arg {String} [options.channelID] The ID of the voice channel to move the member to (must be in voice)
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    editMember(memberID, options, reason) {
        return this._client.editGuildMember.call(this._client, this.id, memberID, options, reason);
    }

    /**
    * Add a role to a guild member
    * @arg {String} memberID The ID of the member
    * @arg {String} roleID The ID of the role
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    addMemberRole(memberID, roleID, reason) {
        return this._client.addGuildMemberRole.call(this._client, this.id, memberID, roleID, reason);
    }

    /**
    * Remove a role from a guild member
    * @arg {String} memberID The ID of the member
    * @arg {String} roleID The ID of the role
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    removeMemberRole(memberID, roleID, reason) {
        return this._client.removeGuildMemberRole.call(this._client, this.id, memberID, roleID, reason);
    }

    /**
    * Kick a member from the guild
    * @arg {String} userID The ID of the member
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    kickMember(userID, reason) {
        return this._client.kickGuildMember.call(this._client, this.id, userID, reason);
    }

    /**
    * Ban a user from the guild
    * @arg {String} userID The ID of the member
    * @arg {Number} [deleteMessageDays=0] Number of days to delete messages for
    * @arg {String} [reason] Reason for the ban
    * @returns {Promise}
    */
    banMember(userID, deleteMessageDays, reason) {
        return this._client.banGuildMember.call(this._client, this.id, userID, deleteMessageDays, reason);
    }

    /**
    * Unban a user from the guild
    * @arg {String} userID The ID of the member
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise}
    */
    unbanMember(userID, reason) {
        return this._client.unbanGuildMember.call(this._client, this.id, userID, reason);
    }

    /**
    * Edit the guild
    * @arg {Object} options The properties to edit
    * @arg {String} [options.name] The ID of the guild
    * @arg {String} [options.region] The region of the guild
    * @arg {String} [options.icon] The guild icon as a base64 data URI. Note: base64 strings alone are not base64 data URI strings
    * @arg {Number} [options.verificationLevel] The guild verification level
    * @arg {Number} [options.defaultNotifications] The default notification settings for the guild. 0 is "All Messages", 1 is "Only @mentions".
    * @arg {Number} [options.explicitContentFilter] The level of the explicit content filter for messages/images in the guild. 0 disables message scanning, 1 enables scanning the messages of members without roles, 2 enables scanning for all messages.
    * @arg {String} [options.systemChannelID] The ID of the system channel
    * @arg {String} [options.afkChannelID] The ID of the AFK voice channel
    * @arg {Number} [options.afkTimeout] The AFK timeout in seconds
    * @arg {String} [options.ownerID] The ID of the member to transfer guild ownership to (bot user must be owner)
    * @arg {String} [options.splash] The guild splash image as a base64 data URI (VIP only). Note: base64 strings alone are not base64 data URI strings
    * @arg {String} [options.banner] The guild banner image as a base64 data URI (VIP only). Note: base64 strings alone are not base64 data URI strings
    * @arg {String} [reason] The reason to be displayed in audit logs
    * @returns {Promise<Guild>}
    */
    edit(options, reason) {
        return this._client.editGuild.call(this._client, this.id, options, reason);
    }

    /**
    * Delete the guild (bot user must be owner)
    * @returns {Promise}
    */
    delete() {
        return this._client.deleteGuild.call(this._client, this.id);
    }

    /**
    * Leave the guild
    * @returns {Promise}
    */
    leave() {
        return this._client.leaveGuild.call(this._client, this.id);
    }

    /**
    * Get the ban list of the guild
    * @returns {Promise<Object[]>} Resolves with an array of {reason: String, user: User}
    */
    getBans() {
        return this._client.getGuildBans.call(this._client, this.id);
    }

    /**
    * Get a ban from the ban list of a guild
    * @arg {String} userID The ID of the banned user
    * @returns {Promise<Object>} Resolves with {reason: String, user: User}
    */
    getBan(userID) {
        return this._client.getGuildBan.call(this._client, this.id, userID);
    }

    /**
    * Edit the bot's nickname in the guild
    * @arg {String} nick The nickname
    * @returns {Promise}
    */
    editNickname(nick) {
        return this._client.editNickname.call(this._client, this.id, nick);
    }

    /**
    * Get all the webhooks in the guild
    * @returns {Promise<Object[]>} Resolves with an array of webhook objects
    */
    getWebhooks() {
        return this._client.getGuildWebhooks.call(this._client, this.id);
    }

    toJSON(props = []) {
        return super.toJSON([
            "afkChannelID",
            "afkTimeout",
            "banner",
            "channels",
            "defaultNotifications",
            "description",
            "emojis",
            "explicitContentFilter",
            "features",
            "icon",
            "joinedAt",
            "large",
            "maxMembers",
            "maxPresences",
            "memberCount",
            "members",
            "mfaLevel",
            "name",
            "ownerID",
            "preferredLocale",
            "premiumSubscriptionCount",
            "premiumTier",
            "region",
            "roles",
            "splash",
            "unavailable",
            "vanityURL",
            "verificationLevel",
            ...props
        ]);
    }
}

module.exports = Guild;
