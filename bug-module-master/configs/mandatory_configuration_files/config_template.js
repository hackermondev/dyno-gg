// Module imports
const { createHmac } = require("crypto");
const { Client } = require("eris");

// Tokens and other sensitive stuff imports / exports
const { botToken, trelloKey, trelloToken, trelloSecret, clientID, clientSecret } = process.env;
const cookieSecret = createHmac("sha1", (Math.pow(Date.now(), 24)).toString(16)).update(((Date.now() + Date.now()) + ((Math.pow(Date.now(), 24)) * (Math.pow(Date.now(), 24) - 1)) / (new Date()).getSeconds()).toString(16)).digest("hex"); // Used for creating signed cookies.

// API related imports
const port = process.env.PORT || 80; // The port to which the API should listen to.

// Used for parsing trello webhooks
const trelloWebhookID = "ID";
const trelloWebhookToken = "webhookToken";

// Used for posting errors thrown by the server
const errorWebhookID = "ID";
const errorWebhookToken = "webhookToken";

// Initializing the Rest Client for Server
const restClient = new Client(`Bot ${botToken}`, { restMode: true });

// Static constants (Do not change)
const botBoardListID = "5b226ca486c819c4e93bd5c7";
const panelBoardListID = "5b4c6b5759ec46c50c4eb738";
const botBoardLabel = "5b5c3e6c9c16fb124a64bb7f";
const panelBoardLabel = "5b5c48209c16fb124ad01ff6";
const botBoardPendingList = "5b5c3e8d2d768f86e772e96d";
const panelBoardPendingList = "5b5c482f81baaf3c4792a03a";
const botBoardDeniedList = "5b60ba4994df19c70c5b1508";
const panelBoardDeniedList = "5b60bc312f79dc745f8dde8b";
const botBoardFixedList = "5b5c43805b1559a326977efc";
const panelBoardFixedList = "5b5c4bdf57299b3e367fa789";

// Bot_Client related configurations
const domain = "domain"; // Used in report command

module.exports = {
    clientID,
    clientSecret,
    botToken,
    domain,
    cookieSecret,
    botBoardListID,
    panelBoardListID,
    trelloKey,
    trelloToken,
    port,
    trelloWebhookID,
    trelloWebhookToken,
    trelloSecret,
    errorWebhookID,
    errorWebhookToken,
    restClient,
    botBoardLabel,
    panelBoardLabel,
    botBoardPendingList,
    panelBoardPendingList,
    botBoardDeniedList,
    panelBoardDeniedList,
    botBoardFixedList,
    panelBoardFixedList
};