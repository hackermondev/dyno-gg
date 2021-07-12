"use strict";

import { Module } from "axoncore";

import * as commands from "./commands/index.js";

class Private extends Module {

    constructor(...args) {
        super(...args);

        this.label = "Private";

        this.enabled = true;
        this.serverBypass = true;

        this.infos = {
            name: "Private",
            description: "The private module which only a select few can use"
        };

        this.init(commands);
    }
}

export default Private;