import Bot from "./bot.js";
import mongoose from "mongoose";

try {
    mongoose.connect("mongodb://localhost/AxonCoreDB");
    Bot.Logger.notice("Connected to AxonCore DataBase.");
}
catch (error) {
    Bot.Logger.emerg("Could NOT connect to AxonCore DataBase.\n" + error.stack);
}

Bot.start();

Bot.Logger.notice("=== ONLINE ===");