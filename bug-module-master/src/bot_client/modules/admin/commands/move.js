"use strict";

import { Command } from "axoncore";
import { readFile, writeFile } from "fs";
import { join } from "path";

class Move extends Command {

    constructor(module) {
        super(module);

        this.label = "move";
        this.aliases = ["move"];

        this.hasSubcmd = false;

        this.infos = {
            name: "move",
            description: "Moves a report from one type to another",
            examples: ["move [Report ID]"],
            arguments: ["Report ID"]
        };

        this.options.argsMin = 1;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
        this.permissions.staff.needed = [...this.axon.staff.owners, ...this.axon.staff.admins, ...this.axon.staff.bug_hunter];
        this.permissions.staff.bypass = [...this.axon.staff.owners, ...this.axon.staff.admins, ...this.axon.staff.bug_hunter];
    }

    async execute({ msg, args }) {
        readFile(join(__dirname, "../../../../../data/reports/userReports.json"), "utf8", (error, data) => {
            if (error !== null) {
                this.axon.Logger.error(error);
            }
            else {
                const { Bugs } = JSON.parse(data);

                labelEnd: {
                    for (const userObject of Bugs) {
                        for (const type in userObject) {
                            const botBugArray = userObject.botBugIDs;
                            const dashBugArray = userObject.dashBugIDs;

                            if (type === "botBugIDs") {
                                for (const bugObject of botBugArray) {
                                    if (bugObject.ID === Number(args[0])) {
                                        const index = botBugArray.indexOf(bugObject);
                                        const splicedData = botBugArray.splice(index, 1);

                                        dashBugArray.push(splicedData[0]);
                                        break labelEnd;
                                    }
                                }
                            }
                            else if (type === "dashBugIDs") {
                                for (const bugObject of dashBugArray) {
                                    if (bugObject.ID === Number(args[0])) {
                                        const index = dashBugArray.indexOf(bugObject);
                                        const splicedData = dashBugArray.splice(index, 1);

                                        botBugArray.push(splicedData[0]);
                                        break labelEnd;
                                    }
                                }
                            }
                        }
                    }
                }

                const json = JSON.stringify({ Bugs }, null, 4);

                writeFile(join(__dirname, "../../../../../data/reports/userReports.json"), json, "utf8", (err) => {
                    if (err !== null) {
                        this.axon.Logger.error(err);
                    }
                    else {
                        writeFile(join(__dirname, "../../../../../data/reports/userReports_Copy.json"), json, "utf8", (err) => {
                            if (err !== null) {
                                this.axon.Logger.error(err);
                            }
                            else {
                                this.sendMessage(msg.channel, "Bug report has been successfully moved from one type to another!");
                            }
                        });
                    }
                });
            }
        });
    }
}

export default Move;