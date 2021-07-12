"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongot_1 = require("mongot");
const PatreonCollection_1 = require("./PatreonCollection");
const PatronCollection_1 = require("./PatronCollection");
var PatreonDocument_1 = require("./documents/PatreonDocument");
exports.PatreonDocument = PatreonDocument_1.PatreonDocument;
var PatronDocument_1 = require("./documents/PatronDocument");
exports.PatronDocument = PatronDocument_1.PatronDocument;
const options = {};
const repository = new mongot_1.Repository('mongodb://localhost/test', options);
exports.patreon = repository.get(PatreonCollection_1.PatreonCollection);
exports.patrons = repository.get(PatronCollection_1.PatronCollection);
//# sourceMappingURL=index.js.map