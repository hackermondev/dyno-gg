"use strict";

import Client from "./client.js";
import axonConf from "../../configs/pre_configured_files/customConf.json";
import tokenConf from "../../configs/optional_configuration_files/tokenConf.json";
import templateConf from "../../configs/pre_configured_files/templateConf.json";
import { botToken } from "../../configs/mandatory_configuration_files/config.js";

const AxonOptions = {
    axonConf,
    templateConf,
    tokenConf,
    resolver: null,
    utils: null,
    axonSchema: null,
    guildSchema: null
};

const Bot = new Client(
    botToken,
    {
        autoreconnect: true,
        defaultImageFormat: "png",
        defaultImageSize: 512,
        disableEveryone: true,
        getAllUsers: true,
        messageLimit: 100,
        restMode: true
    },
    AxonOptions
);

export default Bot;