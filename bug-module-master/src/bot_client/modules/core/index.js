"use strict";

import { Module } from "axoncore";

import * as commands from "./commands/index.js";

class Core extends Module {

    constructor(...args) {
        super(...args);

        this.label = "Core";

        this.enabled = true;
        this.serverBypass = true;

        this.infos = {
            name: "Core",
            description: "The main module with basic commands everyone can use."
        };

        this.init(commands);
    }
}

export default Core;