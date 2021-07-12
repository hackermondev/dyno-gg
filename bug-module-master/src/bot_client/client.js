"use strict";

import AxonClient from "axoncore";
import * as modules from "./modules/index.js";
import { domain } from "../../configs/mandatory_configuration_files/config.js";

class Client extends AxonClient {
    constructor(token, options, axonOptions) {
        super(token, options, axonOptions, modules);
    }

    initStaff() {
        this.staff.bug_hunter = ["320296998332792832"];
        this.Logger.notice("Defined bot staffs have been set up!");
    }

    sendHelp(command, msg) {
        return this.AxonUtils.sendMessage(msg.channel, {
            embed: {
                title: `Command: ${this.params.prefix[0]}${command.label}`,
                description: `**Description**: ${command.infos.description}\n**Usage**: \`${this.params.prefix[0]}${command.label} ${command.infos.arguments[0]}\``
            }
        });
    }

    async sendFullHelp(msg) {
        const dmChannel = await this.client.getDMChannel(msg.author.id);
        return this.AxonUtils.sendMessage(dmChannel, {
            embed: {
                author: {
                    name: this.client.user.username + "#" + this.client.user.discriminator,
                    icon_url: this.client.user.avatarURL
                },
                title: "Bug-Bot",
                url: `https://${domain}/form`,
                description: "A bot to manage the bug flow",
                color: 3447003,
                fields: [
                    {
                        name: "Core Commands",
                        value:
                        `\`${this.params.prefix[0]}ping\` - Pings the bot\n**Usage**: \`${this.params.prefix[0]}ping\`\n
                        \`${this.params.prefix[0]}info\` - Gets general info about this bot\n**Usage**: \`${this.params.prefix[0]}info\`\n
                        \`${this.params.prefix[0]}report\` - Gets the bug report link\n**Usage**: \`${this.params.prefix[0]}report\`\n
                        \`${this.params.prefix[0]}uptime\` - Gets the uptime\n**Usage**:\`${this.params.prefix[0]}uptime\`\n
                        \`${this.params.prefix[0]}reports\` - Gets the list of bugs a user reported\n**Usage**: \`${this.params.prefix[0]}reports [bot/panel] (User - Default is message author)\`\n
                        \`${this.params.prefix[0]}status\` - Gets the status of a bug\n**Usage**: \`${this.params.prefix[0]}status [ReportID]\`\n${String.fromCharCode(8203)}`

                    },
                    {
                        name: "Admin Commands",
                        value:
                        `\`${this.params.prefix[0]}move\` - Moves a report from one type to another\n**Usage**: \`${this.params.prefix[0]}move [Report ID]\`\n
                        \`${this.params.prefix[0]}fixed\` - Moves a report to the list of fixed bugs\n**Usage**: \`${this.params.prefix[0]}fixed [Report ID]\``
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: "Uses the AxonCore framework: https://github.com/Khaazz/AxonCore"
                }
            }
        });
    }

    initStatus() {
        this.client.editStatus(null, {
            name: `with bugs | ${this.params.prefix[0]}help`,
            type: 0
        });
    }

    init() {
        this.reactionCollection = new Map();
        this.executeReaction();
        this.Logger.notice("Reaction listener initialized!");
    }

    addReaction(messageObject, splitMessage, author) {
        const message = {
            split: splitMessage,
            index: 0,
            author
        };
        this.reactionCollection.set(messageObject.id, message);

        setTimeout(() => {
            this.reactionCollection.delete(messageObject.id);
        }, 600000);

        this.client.addMessageReaction(messageObject.channel.id, messageObject.id, "➡");
    }

    executeReaction() {
        this.client.on("messageReactionAdd", async (message, emoji, userID) => {
            const messageObject = this.reactionCollection.get(message.id);
            if ((messageObject !== undefined) && (userID === messageObject.author.id)) {
                if ((emoji.name === "➡") && (messageObject.index < (messageObject.split.length - 1))) {
                    const index = messageObject.index + 1;

                    this.reactionCollection.set(message.id, {
                        split: messageObject.split,
                        index,
                        author: messageObject.author
                    });

                    await this.client.removeMessageReactions(message.channel.id, message.id);

                    await this.client.editMessage(message.channel.id, message.id, {
                        embed: {
                            description: messageObject.split[index],
                            color: 3447003,
                            author: {
                                name: messageObject.author.username + "#" + messageObject.author.discriminator,
                                icon_url: messageObject.author.avatarURL
                            },
                            footer: {
                                text: `Page ${index + 1}/${messageObject.split.length}`
                            }
                        }
                    });

                    if ((index < (messageObject.split.length - 1)) && (index > 0)) {
                        await this.client.addMessageReaction(message.channel.id, message.id, "⬅");
                        this.client.addMessageReaction(message.channel.id, message.id, "➡");
                    }
                    else {
                        this.client.addMessageReaction(message.channel.id, message.id, "⬅");
                    }
                }
                else if ((emoji.name === "⬅") && (messageObject.index > 0)) {
                    const index = messageObject.index - 1;

                    this.reactionCollection.set(message.id, {
                        split: messageObject.split,
                        index,
                        author: messageObject.author
                    });

                    await this.client.removeMessageReactions(message.channel.id, message.id);

                    await this.client.editMessage(message.channel.id, message.id, {
                        embed: {
                            description: messageObject.split[index],
                            color: 3447003,
                            author: {
                                name: messageObject.author.username + "#" + messageObject.author.discriminator,
                                icon_url: messageObject.author.avatarURL
                            },
                            footer: {
                                text: `Page ${index + 1}/${messageObject.split.length}`
                            }
                        }
                    });

                    if ((index < (messageObject.split.length - 1)) && (index > 0)) {
                        await this.client.addMessageReaction(message.channel.id, message.id, "⬅");
                        this.client.addMessageReaction(message.channel.id, message.id, "➡");
                    }
                    else {
                        this.client.addMessageReaction(message.channel.id, message.id, "➡");
                    }
                }
            }
        });
    }
}

export default Client;