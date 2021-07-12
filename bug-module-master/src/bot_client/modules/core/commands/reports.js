"use strict";

import { Command } from "axoncore";
import { readFile } from "fs";
import { join } from "path";

class Reports extends Command {

    constructor(module) {
        super(module);

        this.label = "reports";
        this.aliases = ["reports"];

        this.hasSubcmd = false;

        this.infos = {
            name: "reports",
            description: "Gets the list of bugs a user reported with their respective Report ID",
            examples: ["reports bot @User"],
            arguments: ["[bot / panel] (UserID)"]
        };

        this.options.argsMin = 1;
        this.options.cooldown = 3000;
        this.options.guildOnly = true;
    }

    async execute({ msg, args }) {

        readFile(join(__dirname, "../../../../../data/reports/userReports.json"), "utf8", (err, data) => {
            if (err != null) {
                this.axon.Logger.error(err);
            }
            else {
                try {
                    const jsonData = data;
                    const jsonParsedData = JSON.parse(jsonData);
                    const type = args.shift().toLowerCase();
                    const resolvedUser = (args.join("").length === 0) ? msg.author : this.Resolver.user(this.bot, args.join(""));
                    const arguments2 = resolvedUser.id;
                    if (jsonParsedData.Bugs.length != 0) {
                        const filteredData = jsonParsedData.Bugs.filter((objects) => {
                            return objects.UserID == arguments2;
                        });

                        if ((type !== "bot") && (type !== "panel")) {
                            return this.sendMessage(msg.channel, "Invalid command arguments, please refer help for more info");
                        }

                        if ((filteredData[0].botBugIDs.length != 0) && (type === "bot")) {
                            return this.returnValue(filteredData[0].botBugIDs, msg, resolvedUser);
                        }
                        else if ((filteredData[0].dashBugIDs.length != 0) && (type === "panel")) {
                            return this.returnValue(filteredData[0].dashBugIDs, msg, resolvedUser);
                        }

                        if ((type == "bot") && (filteredData[0].botBugIDs.length == 0)) {
                            return this.sendMessage(msg.channel, "A list of bot bugs cannot be found.");
                        }
                        else if ((type == "panel") && (filteredData[0].dashBugIDs.length == 0)) {
                            return this.sendMessage(msg.channel, "A list of panel bugs cannot be found.");
                        }
                    }
                    else {
                        return this.sendMessage(msg.channel, "Looks like the JSON DB is empty");
                    }
                }
                catch (err) {
                    return this.sendMessage(msg.channel, `${err}`);
                }
            }
        });
    }

    async returnValue(Data, msg, resolvedUser) {
        try {
            const bugIDList = ["List of reported bugs\n\n"];
            let index = 0;

            for (const objects of Data) {
                for (const xValue in objects) {
                    if (xValue == "Report_Tag") {
                        index = index + 1;
                        bugIDList.push(`${index})\n**Report Tag**: ${objects[xValue]}\n`);
                    }
                    else if (xValue == "Report_ID") {
                        bugIDList.push(`**Report Link**: https://trello.com/c/${objects[xValue]}\n\n`);

                        if ((index !== 1) && ((index - 1) % 10 === 0)) {
                            bugIDList.push("||");
                        }
                    }
                    else {
                        bugIDList.push(`**Report ID**: ${objects[xValue]}\n`);
                    }
                }
            }
            const bugList = bugIDList.join("");

            if (bugList.length < 2048) {
                const filteredBugList = bugList.split("||").join("");
                await this.sendMessage(msg.channel, {
                    embed: {
                        description: filteredBugList,
                        color: 3447003,
                        author: {
                            name: resolvedUser.username + "#" + resolvedUser.discriminator,
                            icon_url: resolvedUser.avatarURL
                        }
                    }
                });
            }
            else {
                const splitMessage = bugList.split("||");
                const messageObject = await this.sendMessage(msg.channel, {
                    embed: {
                        description: splitMessage[0],
                        color: 3447003,
                        author: {
                            name: resolvedUser.username + "#" + resolvedUser.discriminator,
                            icon_url: resolvedUser.avatarURL
                        },
                        footer: {
                            text: `Page 1/${splitMessage.length}`
                        }
                    }
                });

                this.axon.addReaction(messageObject, splitMessage, msg.author);
            }
        }
        catch (error) {
            this.axon.Logger.warn(error);
        }
    }
}

export default Reports;