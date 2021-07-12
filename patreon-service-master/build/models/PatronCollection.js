"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongot_1 = require("mongot");
const PatronDocument_1 = require("./documents/PatronDocument");
/**
 * Patron Collection
 */
let PatronCollection = class PatronCollection extends mongot_1.Collection {
};
PatronCollection = __decorate([
    mongot_1.index('id', { unique: true }),
    mongot_1.index('deleted'),
    mongot_1.index('discord_id'),
    mongot_1.index('pledge.id'),
    mongot_1.collection('patrons', PatronDocument_1.PatronDocument)
], PatronCollection);
exports.PatronCollection = PatronCollection;
//# sourceMappingURL=PatronCollection.js.map