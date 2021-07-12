"use strict";

import { Command } from "axoncore";
import { inspect } from "util";

class Eval extends Command {

    constructor(module) {
        super(module);

        this.label = "eval";
        this.aliases = ["eval"];
        this.infos = {
            name: "eval",
            description: "Evaluates the input",
            arguments: ["input"],
            examples: [""]
        };
        this.hasSubcmd = false;
        this.options.argsMin = 1;
        this.options.guildOnly = true;
        this.permissions.staff.needed = [...this.axon.staff.owners, ...this.axon.staff.bug_hunter];
        this.permissions.staff.bypass = [...this.axon.staff.owners, ...this.axon.staff.bug_hunter];
    }

    async execute({ msg, args }) {
        const code = args.join(" ");
        let evaled;
        try {
            evaled = await eval(code);

            switch (typeof evaled) {
                case "object": {
                    evaled = inspect(evaled, { depth: 0 });
                    break;
                }
                default: {
                    evaled = `${evaled}`;
                }
            }

            // For Security
            evaled = evaled.split(this.bot._token).join("Potato!");

            if (evaled.length <= 1900) {
                const description = `Your eval resulted in this result:\n\`\`\`js\n${evaled}\n\`\`\``;
                this.messageCreate(msg, description);
            }
            else if (evaled.length > 1900) {
                const description = this.axon.Utils.splitMessage(evaled);

                for (const content of description) {
                    this.messageCreate(msg, content);
                }
            }
        }
        catch (err) {
            const err2 = err.stack;

            if (err2.length <= 1900) {
                const description = `Your eval resulted in this error:\n\`\`\`js\n${err2}\n\`\`\``;
                this.messageCreate(msg, description);
            }
            else if (err2.length > 1900) {
                const description = this.axon.Utils.splitMessage(err2);

                for (const content of description) {
                    this.messageCreate(msg, content);
                }
            }
        }
    }

    messageCreate(msg, description) {
        return this.sendMessage(msg.channel, {
            embed: {
                color: 3447003,
                title: "EVAL",
                description,
                author: {
                    name: msg.author.username,
                    icon_url: msg.author.avatarURL
                },
                timestamp: new Date()
            }
        });
    }
}

export default Eval;