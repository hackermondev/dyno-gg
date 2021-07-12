"use strict";

import { Command } from "axoncore";
import { readFile } from "fs";
import requestHandler from "../../../../utilities/requestHandler.js";
import { trelloKey, trelloToken, botBoardPendingList, panelBoardPendingList, botBoardDeniedList, panelBoardDeniedList, botBoardFixedList, panelBoardFixedList } from "../../../../../configs/mandatory_configuration_files/config.js";
import { inspect } from "util";
import { join } from "path";

class Status extends Command {

    constructor(module) {
        super(module);

        this.label = "status";
        this.aliases = ["status"];

        this.hasSubcmd = false;

        this.infos = {
            name: "status",
            description: "Gets a bug report and its status",
            examples: ["status [ReportID]"],
            arguments: ["ReportID"]
        };

        this.options.argsMin = 1;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
    }

    async execute({ msg, args }) {
        readFile(join(__dirname, "../../../../../data/reports/userReports.json"), "utf8", async (error, data) => {
            try {
                if (error != null) {
                    this.axon.Logger.error(error);
                }
                else {
                    const jsonParsed = JSON.parse(data);
                    let cardObject;

                    breakLabel: {
                        for (const { botBugIDs, dashBugIDs } of jsonParsed.Bugs) {
                            const concatenatedIDs = [...botBugIDs, ...dashBugIDs];

                            for (const bugObject of concatenatedIDs) {
                                if (bugObject.ID == args[0]) {
                                    cardObject = bugObject;
                                    break breakLabel;
                                }
                            }
                        }
                    }

                    let status;
                    if (typeof cardObject === "object") {
                        try {
                            const requestData = await requestHandler.request(`cards/${cardObject.Report_ID}`, "trello", "get", {}, {
                                key: trelloKey,
                                token: trelloToken
                            });

                            const listID = requestData.body.idList;

                            if ((listID === botBoardPendingList) || (listID === panelBoardPendingList)) {
                                status = "Pending approval";
                            }
                            else if ((listID === botBoardDeniedList) || (listID === panelBoardDeniedList)) {
                                status = "Denied || NAB";
                            }
                            else if ((listID === botBoardFixedList) || (listID === panelBoardFixedList)) {
                                status = "Fixed";
                            }
                            else {
                                status = "Approved";
                            }

                            if ((requestData.body.name + requestData.body.desc).length < 2000) {
                                console.log("Test");
                                this.sendMessage(msg.channel, {
                                    embed: {
                                        title: `Status of Report ID: ${args[0]}`,
                                        url: `https://trello.com/c/${cardObject.Report_ID}`,
                                        description: `**Bug**:\n${requestData.body.name}\n\n${requestData.body.desc}\n**Status**: ${status}`,
                                        color: 3447003
                                    }
                                });
                            }
                            else {
                                const splitMessage = this.Utils.splitMessage(`**Bug**:\n${requestData.body.name}\n\n${requestData.body.desc}\n**Status**: ${status}`);

                                for (const cardData of splitMessage) {
                                    return this.sendMessage(msg.channel, {
                                        embed: {
                                            title: `Status of Report ID: ${args[0]}`,
                                            url: `https://trello.com/c/${cardObject.Report_ID}`,
                                            description: cardData,
                                            color: 3447003
                                        }
                                    });
                                }
                            }
                        }
                        catch (error) {
                            this.axon.Logger.error(inspect(error, { depth: 0 }));
                            return this.sendMessage(msg.channel, "The report may have gotten deleted from the board!");
                        }
                    }
                    else {
                        return this.sendMessage(msg.channel, "Could not fetch a report of specified ID");
                    }
                }
            }
            catch (someError) {
                this.axon.Logger.warn(inspect(someError, { depth: 0 }));
            }
        });
    }
}

export default Status;