"use strict";

import { Command } from "axoncore";

class Ping extends Command {

    constructor(module) {
        super(module);

        this.label = "ping";
        this.aliases = ["ping"];

        this.hasSubcmd = false;

        this.infos = {
            name: "ping",
            description: "Pings the bot.",
            examples: ["ping"],
            arguments: [""]
        };

        this.options.argsMin = 0;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
    }

    async execute({ msg }) {
        const start = Date.now();

        const mess = await this.sendMessage(msg.channel, "Pinging! ");

        if (!mess) {
            return;
        }

        const diff = (Date.now() - start);

        return this.editMessage(mess, `Pong: \`${diff}\` ms\nLatency: \`${msg.channel.guild.shard.latency}\` ms`);
    }
}

export default Ping;