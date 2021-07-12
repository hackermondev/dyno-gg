"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongot_1 = require("mongot");
const mongot_2 = require("mongot");
/**
 * Pledge sub document
 */
let PledgeFragment = class PledgeFragment extends mongot_1.SchemaFragment {
};
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PledgeFragment.prototype, "id", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Number)
], PledgeFragment.prototype, "amount_cents", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Date)
], PledgeFragment.prototype, "created_at", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Date)
], PledgeFragment.prototype, "declined_since", void 0);
PledgeFragment = __decorate([
    mongot_2.fragment
], PledgeFragment);
/**
 * Patron Document
 */
let PatronDocument = class PatronDocument extends mongot_1.SchemaDocument {
    /**
     * Patron Document
     */
    constructor() {
        super(...arguments);
        this.deleted = false;
    }
};
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "id", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "discord_id", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "email", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "first_name", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "last_name", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "full_name", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Boolean)
], PatronDocument.prototype, "is_email_verified", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "image_url", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "thumb_url", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatronDocument.prototype, "url", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", PledgeFragment)
], PatronDocument.prototype, "pledge", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Boolean)
], PatronDocument.prototype, "deleted", void 0);
PatronDocument = __decorate([
    mongot_2.document
], PatronDocument);
exports.PatronDocument = PatronDocument;
//# sourceMappingURL=PatronDocument.js.map