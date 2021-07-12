"use strict";

import { Command } from "axoncore";

class Info extends Command {

    constructor(module) {
        super(module);

        this.label = "info";
        this.aliases = ["info"];

        this.hasSubcmd = false;

        this.infos = {
            name: "info",
            description: "General info",
            examples: ["info"],
            arguments: [""]
        };

        this.options.argsMin = 0;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
    }

    execute({ msg }) {
        return this.sendMessage(msg.channel, {
            embed: {
                title: "General info",
                description: "A bot to manage bug flow\n\nDashboard bug board link: https://trello.com/b/4Mn9hll1\n\nBot bug board link: https://trello.com/b/tbrQGrP5",
                color: 3447003,
                footer: {
                    text: "This Bot is built on AxonCore framework: https://github.com/Khaazz/AxonCore"
                },
                fields: [
                    {
                        name: "Contributors",
                        value: "1) KhaaZ#0001\nHuge thanks to KhaaZ for helping me to begin with Coding in general, for providing constructive criticism, and for doing extensive code review of this project.\n\n2) Ape#7739\nMy sincere thanks to Ape for providing resources to learn node and to begin with Web Development and for being very helpful in general even when not asked for.\n\n3) Joe♥#2000\nMy sincere thanks to Joe for helping me to import around 300 bugs to the two new trello boards which would have taken a very long time if I had done it by myself",
                        inline: false
                    }
                ]
            }
        });
    }
}

export default Info;