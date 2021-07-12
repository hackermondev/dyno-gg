const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const { cookieSecret, port, errorWebhookID, errorWebhookToken } = require("../../configs/mandatory_configuration_files/config.js");
const Logger = require("./logger/logger.js");
const { router } = require("./routes/routes.js");
const requestHandler = require("../utilities/requestHandler.js");
const customError = "An error occurred. Please try again later. If the issue persists, please inform the bug hunter!";

app.use(cookieParser(cookieSecret));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res, next) => {
    try {
        return res.redirect(`https://${req.hostname}/login`);
    }
    catch (error) {
        return next(error);
    }
});

app.use("/", router);
app.use(methodOverride());

// Error handling function
app.use(async (err, req, res, next) => { // eslint-disable-line
    // This function has an unwanted next parameter because express Docs tell us to define an error handling middleware with the aforementioned four parameters.
    try {
        await requestHandler.request(`webhooks/${errorWebhookID}/${errorWebhookToken}`, "discord", "post", {}, { wait: true }, {
            username: "Error Logger",
            avatarURL: "https://starttraffic.uk/image/cache/catalog/product-photos/signs/metal-signs/750mm-triangular/metal-sign-danger-warning-1800x1200_0.jpg",
            embeds: [{
                title: err.message,
                description: `**Domain**: \`${req.hostname}\`\n**Path**: \`${req.originalUrl}\`\n**URL**: [\`https://${req.hostname}${req.originalUrl}\`](https://${req.hostname}${req.originalUrl})\n**IP**: \`${(req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(",")[0])
                        || req.ip
                        || (req.connection && req.connection.remoteAddress)}\`\n**Stack**: \`\`\`js\n${err.stack}\`\`\``,
                color: 0xff0000,
                timestamp: new Date()
            }],
        });

        Logger.error(err.stack);
        return res.status(500).send(customError);
    }
    catch (error) {
        Logger.error("Couldn't post error webhook\n" + `${error.stack}\n\n${err.response.body}`);
        return res.status(500).send(customError);
    }
});

app.listen(port, Logger.notice(`Listening to port ${port}`));