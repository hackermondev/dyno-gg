"use strict";

import { Command } from "axoncore";

class Uptime extends Command {

    constructor(module) {
        super(module);

        this.label = "uptime";
        this.aliases = ["uptime", "up"];

        this.infos = {
            name: "uptime",
            description: "Gets the bot's uptime",
            examples: ["uptime"],
            arguments: [""]
        };
    }

    execute({ msg }) {
        const date = new Date(this.bot.uptime);
        let str = "";

        if (date.getUTCDate() - 1 >= 1) {
            str += date.getUTCDate() - 1 + "d, ";
        }
        if (date.getUTCHours() >= 1) {
            str += date.getUTCHours() + "h, ";
        }
        if (date.getUTCMinutes() >= 1) {
            str += date.getUTCMinutes() + "min, ";
        }
        if (date.getUTCSeconds() >= 1) {
            str += date.getUTCSeconds() + "sec, ";
        }
        if (date.getUTCMilliseconds() >= 1) {
            str += date.getUTCMilliseconds() + "ms";
        }

        return this.sendMessage(msg.channel, {
            embed: {
                color: this.Template.embed.colors.global,
                author: {
                    name: "Uptime",
                    icon_url: msg.author.avatarURL
                },
                description: str,
                timestamp: new Date(this.bot.startTime),
                footer: {
                    text: "Last started at "
                }
            }
        });
    }
}

export default Uptime;