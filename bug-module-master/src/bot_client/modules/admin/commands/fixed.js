"use strict";

import { Command } from "axoncore";
import { readFile } from "fs";
import requestHandler from "../../../../utilities/requestHandler.js";
import { trelloKey, trelloToken, botBoardFixedList, panelBoardFixedList } from "../../../../../configs/mandatory_configuration_files/config.js";
import { join } from "path";

class Fixed extends Command {

    constructor(module) {
        super(module);

        this.label = "fixed";
        this.aliases = ["fixed"];

        this.hasSubcmd = false;

        this.infos = {
            name: "fixed",
            description: "Moves a report to the list of fixed bugs in trello",
            examples: ["fixed [Report ID]"],
            arguments: ["Report ID"]
        };

        this.options.argsMin = 1;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
        this.permissions.staff.needed = [...this.axon.staff.owners, ...this.axon.staff.admins, ...this.axon.staff.bug_hunter];
        this.permissions.staff.bypass = [...this.axon.staff.owners, ...this.axon.staff.admins, ...this.axon.staff.bug_hunter];
    }

    async execute({ msg, args }) {
        readFile(join(__dirname, "../../../../../data/reports/userReports.json"), "utf8", async (error, data) => {
            if (error !== null) {
                this.axon.Logger.error(error);
            }
            else {
                try {
                    const { Bugs } = JSON.parse(data);
                    let cardObject;
                    let type;

                    breakLabel: {
                        for (const { botBugIDs, dashBugIDs } of Bugs) {
                            const bugObjects = [...botBugIDs, ...dashBugIDs];

                            for (const bugObject of bugObjects) {
                                if (bugObject.ID === Number(args[0])) {
                                    type = (botBugIDs.indexOf(bugObject) !== -1) ? "Bot-Bug" : "Dash-Bug";
                                    cardObject = bugObject;
                                    break breakLabel;
                                }
                            }
                        }
                    }

                    const requestData = await requestHandler.request(`cards/${cardObject.Report_ID}`, "trello", "put", {}, {
                        idList: (type === "Bot-Bug") ? botBoardFixedList : panelBoardFixedList,
                        key: trelloKey,
                        token: trelloToken
                    });

                    if (requestData !== undefined) {
                        this.sendMessage(msg.channel, `Report ${args[0]} has been successfully moved to the list of fixed bugs!`);
                    }
                }
                catch (err) {
                    this.axon.Logger.error(err.stack);
                    this.sendMessage(msg.channel, `${err}`);
                }
            }
        });
    }
}

export default Fixed;