# bug-module

This is a module which could be helpful in managing the bug flow. This module comprises of an internal API to parse trello webhooks and for the internal functionality of the report website. It also comprises of a bot client which could be used to obtain the status of a report and such.

To start the API and the Bot_Client, we would have to execute the following commands. The configuration of this bug-module can be changed in this [file](https://git.dyno.sh/Santhosh-Annamalai/bug-module/blob/master/configs/mandatory_configuration_files/config_template.js)

Before using these commands, please make sure to remove the `_template` part from the name of [config-template.js](https://git.dyno.sh/Santhosh-Annamalai/bug-module/blob/master/configs/mandatory_configuration_files/config_template.js).

To start the API => `node src/server/app.js`.

To start the Bot_Client => `node -r esm src/bot_client/index.js`.

PM2 scripts are located in the scripts folder which could also be used.

If we want to have a trello Webhook post actions taking place in board(s), we would have to create a trello webhook by sending a post request to trello API, the request would look something like this when [superagent](http://visionmedia.github.io/superagent) is used. More information about trello webhooks [here](https://developers.trello.com/page/webhooks)

```js
const superagent = require("superagent");

superagent
.post("https://api.trello.com/1/tokens/{APIToken}/webhooks")
.set("Content-Type", "application/json")
.query({
    key: APIKey
})
.field({
    description: "Anything you want (Used for identification purposes when you view the details of a Webhook. More info about it here: https://developers.trello.com/v1.0/reference#webhook-object-1",
    callBackURL: "The URL to which this API should respond (Should be https://{domain}/webhookparser in our case)",
    idModel: "The ID of the Trello Board to watch"
})
.then(value => console.log(value.error))
.catch(error => console.log(error.response.error.text));```