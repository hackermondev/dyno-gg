const superagent = require("superagent");
const { join } = require("path");
const { Router } = require("express");
const { readFile, writeFile } = require("fs");
const { promisify } = require("util");
const { createHmac, timingSafeEqual } = require("crypto");
const multer = require("multer");
const requestHandler = require("../../utilities/requestHandler.js");
const readFilePromise = promisify(readFile);
const writeFilePromise = promisify(writeFile);
const router = Router();
const upload = multer({
    limits: {
        fileSize: 8000000,
        files: 8
    }
});
const allowedIP = ["107.23.104.115", "107.23.149.70", "54.152.166.250", "54.164.77.56", "54.209.149.230"];
const { clientID, clientSecret, trelloToken, trelloKey, trelloSecret, botBoardListID, panelBoardListID, botBoardLabel, panelBoardLabel, trelloWebhookID, trelloWebhookToken, botToken } = require("../../../configs/mandatory_configuration_files/config.js");
const { typeParser } = require("../trello_actions/types.js");

router.get("/stylesheet", (req, res, next) => {
    try {
        if (req.signedCookies.EntityID !== undefined) {
            return res.status(200).sendFile(join(__dirname, "../../website/css/stylesheet.css"));
        }
        else {
            return res.redirect("https://www.dynobot.net");
        }
    }
    catch (err) {
        return next(err);
    }
});

router.get("/javascript", (req, res, next) => {
    try {
        if (req.signedCookies.EntityID !== undefined) {
            return res.status(200).sendFile(join(__dirname, "../../website/js/scripts.js"));
        }
        else {
            return res.redirect("https://www.dynobot.net");
        }
    }
    catch (err) {
        return next(err);
    }
});

router.get("/login", (req, res, next) => {
    try {
        if (req.signedCookies.EntityID === undefined) {
            return res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(`https://${req.hostname}/auth`)}&response_type=code&scope=identify`);
        }
        else {
            return res.redirect(`https://${req.hostname}/form`);
        }
    }
    catch (error) {
        return next(error);
    }
});

router.get("/logout", (req, res, next) => {
    function clearCookies(name, path) {
        return res.clearCookie(name, {
            path
        });
    }

    try {
        clearCookies("EntityFullName", "/");
        clearCookies("EntityID", "/");
        clearCookies("placeholderID", "/form");

        return res.redirect("https://www.dynobot.net");
    }
    catch (error) {
        return next(error);
    }
});

router.get("/form", (req, res, next) => {
    try {
        if (req.signedCookies.EntityID !== undefined) {
            return res.status(200).sendFile(join(__dirname, "../../website/html/index.html"));
        }
        else {
            return res.redirect(`https://${req.hostname}/login`);
        }
    }
    catch (error) {
        return next(error);
    }
});

router.get("/auth", async (req, res, next) => {
    const { hostname } = req;

    function createCookie(cookieName, cookieValue, signed, httpOnly, secure, date) {
        return res.cookie(cookieName, cookieValue, {
            expires: date,
            httpOnly,
            secure,
            signed
        });
    }
    try {
        const { code } = req.query;
        const btoa = require("btoa");
        if (code !== undefined) {
            const headers = {
                Authorization: `Basic ${btoa(`${clientID}:${clientSecret}`)}`,
                "Content-Type": "x-www-form-urlencoded"
            };
            const queryParams = {
                grant_type: "authorization_code",
                code,
                redirect_uri: `https://${hostname}/auth`
            };
            const authRequest = await requestHandler.request("oauth2/token", "discord", "post", headers, queryParams);
            const userToken = authRequest.body.access_token;
            const userObjectRequest = await requestHandler.request("users/@me", "discord", "get", {
                Authorization: `Bearer ${userToken}`
            });
            const userObject = userObjectRequest.body;
            const userID = userObject.id;
            const avatarHash = userObject.avatar;
            const { username, discriminator } = userObject;
            try {
                const { roles } = await requestHandler.request(`guilds/203039963636301824/members/${userID}`, "discord", "get", {
                    "Authorization": `Bot ${botToken}`
                });
                const finalRoles = roles.filter(RoleID => ["355054563931324420", "370679044447928321", "428655220243955722"].includes(RoleID)); // Staff, Support, and Verified Bug Hunter RoleIDs.
                if (finalRoles.length > 0) {
                    createCookie("EntityFullName", `${username}#${discriminator}`, false, false, false, 0);
                    createCookie("EntityAvatar", `https://cdn.discordapp.com/avatars/${userID}/${avatarHash}.${(avatarHash.startsWith("a_") === true) ? "gif" : "png"}`, false, false, false, 0);
                    createCookie("placeholderID", userID, false, false, false, 0);
                    createCookie("EntityID", userID, true, true, true, new Date(Date.now() + 1800000));

                    return res.redirect(`https://${hostname}/form`);
                }
                else {
                    return res.redirect("https://www.dynobot.net");
                }
            }
            catch (error) {
                if (error.message.includes("10007")) { // 10007 => User isn't a member of the server.
                    return res.redirect("https://www.dynobot.net");
                }
                else {
                    return next(error);
                }
            }
        }
        else {
            return res.redirect("https://www.dynobot.net");
        }
    }
    catch (error) {
        return next(error);
    }
});

const formParserFields = upload.fields([
    {
        name: "Attachments"
    }
]);
router.post("/formparser", formParserFields, async (req, res, next) => {
    async function createCard(listID, labelparam, EntityFullName, EntityID, Bug, Details, reproSteps, tag, info, type, linkAttachString) {
        function additionalInfo() {
            if (info.length != 0) {
                return `\n\n**Additional info**:\n${info}`;
            }
            else {
                return info;
            }
        }

        const reportsJSON = await readFilePromise(join(__dirname, "../../../data/reports/userReports.json"), "utf8");
        const parsedJSON = JSON.parse(reportsJSON);
        const { Bugs } = parsedJSON;
        const attachments = req.files.Attachments;

        // For getting the ID of the report
        function fetchID() {
            if (Bugs.length !== 0) {
                const botBugIDList = [];
                const dashBugIDList = [];

                for (const { botBugIDs, dashBugIDs } of Bugs) {
                    if (botBugIDs.length !== 0) {
                        for (const { ID } of botBugIDs) {
                            botBugIDList.push(ID);
                        }
                    }

                    if (dashBugIDs.length !== 0) {
                        for (const { ID } of dashBugIDs) {
                            dashBugIDList.push(ID);
                        }
                    }
                }

                const finalIDList = [...botBugIDList, ...dashBugIDList];
                let max = 0;

                for (const ID of finalIDList) {
                    if (ID > max) {
                        max = ID;
                    }
                }

                return (max + 1);
            }
            else { // This scenario would most likely never occur, until and unless we use a new DB.
                return 1;
            }
        }

        const ID = fetchID();

        // Request which posts the card
        const cardPostRequest = await requestHandler.request("card", "trello", "post", {}, {}, {
            name: Bug,
            desc: `**Details**:\n${Details}\n\n**Repro Steps**:\n${reproSteps}${additionalInfo()}\n\n**Tags**: ${tag}\n\n**Reported by**: ${EntityFullName}\n**Reporter ID**: ${EntityID}\n**Report ID**: ${ID}`,
            key: trelloKey,
            token: trelloToken,
            idList: listID,
            idLabels: labelparam
        });
        const cardID = cardPostRequest.body.id;
        const userObject = Bugs.find(user => {
            return user.UserID === EntityID;
        });

        // Writing bug Object to JSON file
        async function editDB() {
            function BugObject() {
                this.Report_Tag = tag;
                this.ID = ID;
                this.Report_ID = cardID;
            }

            function UserObject(bugObject, bool) {
                this.UserID = EntityID;
                this.botBugIDs = (bool === true) ? [bugObject] : [];
                this.dashBugIDs = (bool === false) ? [bugObject] : [];
            }

            const bugObject = new BugObject();

            if (userObject !== undefined) {
                const index = Bugs.indexOf(userObject);
                const { botBugIDs, dashBugIDs } = userObject;
                Bugs.splice(index, 1);

                if (type === "Bot Bug") {
                    botBugIDs.push(bugObject);
                    Bugs.push(userObject);
                }
                else if (type === "Dashboard Bug") {
                    dashBugIDs.push(bugObject);
                    Bugs.push(userObject);
                }
            }
            else {
                if (type === "Bot Bug") {
                    const userObject = new UserObject(bugObject, true);
                    Bugs.push(userObject);
                }
                else if (type === "Dashboard Bug") {
                    const userObject = new UserObject(bugObject, false);
                    Bugs.push(userObject);
                }
            }

            const jsonStringified = JSON.stringify({ Bugs }, null, 4);

            await writeFilePromise(join(__dirname, "../../../data/reports/UserReports.json"), jsonStringified, "utf8");
            return await writeFilePromise(join(__dirname, "../../../data/reports/UserReports_Copy.json"), jsonStringified, "utf8");
        }

        // For uploading attachments in case if any has been uploaded to this endpoint
        async function finalizeUploads() {
            if (Array.isArray(attachments)) {
                for (const attachment of attachments) {
                    const { buffer, originalname, mimetype } = attachment;
                    if (Buffer.isBuffer(buffer)) { // Checking whether the file object has a buffer because some corrupt files don't have a valid buffer. Observed it in my testing.
                        await requestHandler.request(`cards/${cardID}/attachments`, "trello", "post", {}, {}, {
                            name: originalname,
                            mimeType: mimetype,
                            key: trelloKey,
                            token: trelloToken
                        }, {
                            file: "file",
                            buffer,
                            details: {
                                filename: originalname,
                                contentType: mimetype
                            }
                        });
                    }
                    else {
                        return res.status(400).send(`${originalname} seems to be a corrupted file`);
                    }
                }

                return res.redirect(`https://trello.com/c/${cardID}`);
            }
            else if (linkAttachString !== undefined) {
                const linkArray = linkAttachString.split("||");
                const linkArrayLength = linkArray.length;
                if (linkArrayLength <= 8) {
                    let index = 0;

                    for (const link of linkArray) {
                        index = index + 1;
                        const { body } = await superagent.get(link);

                        if (Buffer.isBuffer(body)) {
                            await requestHandler.request(`cards/${cardID}/attachments`, "trello", "post", {}, {}, {
                                name: `Link - ${index}`,
                                url: link.trim(),
                                key: trelloKey,
                                token: trelloToken
                            });

                            if (index === linkArrayLength) {
                                return res.redirect(`https://trello.com/c/${cardID}`);
                            }
                        }
                        else {
                            return res.status(400).send(`Link \`${link}\` is an invalid file upload URL! Here is a link to the report you made: https://trello.com/c/${cardID}`);
                        }
                    }
                }
                else {
                    return res.status(400).send(`Please contact the bug hunter if you want to upload more than 8 attachments. Here is a link to the report you made: https://trello.com/c/${cardID}`);
                }
            }
            else {
                return res.redirect(`https://trello.com/c/${cardID}`);
            }
        }

        await editDB();
        return await finalizeUploads();
    }

    try {
        const { EntityFullName, EntityID } = req.signedCookies;
        const { Bug, Details, reproSteps, tag, info, type, Attachments2 } = req.body;

        if ((type === "Bot Bug") && (EntityID !== undefined)) {
            return await createCard(botBoardListID, botBoardLabel, EntityFullName, EntityID, Bug, Details, reproSteps, tag, info, type, Attachments2);
        }
        else if ((type === "Dashboard Bug") && (EntityID !== undefined)) {
            return await createCard(panelBoardListID, panelBoardLabel, EntityFullName, EntityID, Bug, Details, reproSteps, tag, info, type, Attachments2);
        }
        else {
            return res.redirect(`https://${req.hostname}/login`);
        }
    }
    catch (error) {
        return next(error);
    }
});

// Trello Webhook parser routes

router.get("/webhookparser", (req, res, next) => {
    try {
        const ip = req.headers["x-forwarded-for"].split(",")[0];
        if (ip === allowedIP.find(IP => {
            return IP === ip;
        })) {
            return res.send("Hello World!");
        }
    }
    catch (error) {
        return next(error);
    }
});

// I added support for get request here because Trello API will send a quick http head request before it creates a webhook for a callback URL. More info about it here: https://developers.trello.com/page/webhooks#section-creating-a-webhook

router.post("/webhookparser", async (req, res, next) => {
    try {
        const HMAC = createHmac("sha1", trelloSecret).update(JSON.stringify(req.body) + `https://${req.hostname}/webhookparser`).digest("base64");
        const timeSafeEqual = timingSafeEqual(Buffer.from(HMAC, "base64"), Buffer.from(req.headers["x-trello-webhook"], "base64"));
        if (timeSafeEqual === true) {
            const { action, model } = req.body;
            const { memberCreator, date, data } = action;
            const { fullName, username, avatarUrl } = memberCreator;
            const { card } = data;
            const cardLink = (data.hasOwnProperty("card")) ? ((card.hasOwnProperty("name") && card.hasOwnProperty("shortLink"))
                ? `[\`${card.name}\`](https://www.trello.com/c/${card.shortLink})` : null) : null;
            const parsedData = await typeParser(action, fullName, model, cardLink);

            const response = await requestHandler.request(`webhooks/${trelloWebhookID}/${trelloWebhookToken}`, "discord", "post", {}, {
                wait: true
            }, {
                username: "Trello",
                avatarURL: "https://www.shareicon.net/data/128x128/2017/06/23/887696_cards_512x512.png",
                embeds: [{
                    title: `Board: ${model.name}`,
                    url: model.url,
                    description: parsedData[0],
                    color: parsedData[1],
                    author: {
                        name: fullName,
                        url: `https://trello.com/${username}`,
                        icon_url: ((avatarUrl !== null) ? `${avatarUrl}/170.png` : null)
                    },
                    timestamp: date
                }],
            });
            if (response.status === 200) {
                return res.status(200).send("Success!");
            }
        }
    }
    catch (error) {
        return next(error);
    }
});

module.exports = {
    router
};