"use strict";

import { Command } from "axoncore";
import { domain } from "../../../../../configs/mandatory_configuration_files/config.js";

class Report extends Command {

    constructor(module) {
        super(module);

        this.label = "report";
        this.aliases = ["report"];

        this.hasSubcmd = false;

        this.infos = {
            name: "report",
            description: "Gets the bug report link",
            examples: ["report"],
            arguments: [""]
        };

        this.options.argsMin = 0;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
    }

    execute({ msg }) {
        return this.sendMessage(msg.channel, `You can report bugs here: <https://${domain}/form>`);
    }
}

export default Report;