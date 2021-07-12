"use strict";

import { Module } from "axoncore";

import * as commands from "./commands/index.js";

class Admin extends Module {

    constructor(...args) {
        super(...args);

        this.label = "Admin";

        this.enabled = true;
        this.serverBypass = true;

        this.infos = {
            name: "Admin",
            description: "This module contains commands only defined staffs could use"
        };

        this.init(commands);
    }
}

export default Admin;