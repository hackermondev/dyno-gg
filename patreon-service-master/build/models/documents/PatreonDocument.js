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
const Utils_1 = require("../../Utils");
/**
 * Patreon Auth Document
 */
let PatreonDocument = class PatreonDocument extends mongot_1.SchemaDocument {
    encryptSecrets() {
        const secretKey = process.env.SECRET_KEY;
        if (secretKey == undefined) {
            throw new Error('SECRET_KEY is undefined');
        }
        this.access_token = Utils_1.Utils.encrypt(Utils_1.Utils.sha256(`${this.expires}.${secretKey}`), this.access_token);
        this.refresh_token = Utils_1.Utils.encrypt(Utils_1.Utils.sha256(`${this.expires}.${secretKey}`), this.refresh_token);
    }
    setExpires() {
        const expires = Date.now() + this.expires_in;
        this.expires = new Date(expires);
    }
    get accessToken() {
        const secretKey = process.env.SECRET_KEY;
        if (secretKey == undefined) {
            throw new Error('SECRET_KEY is undefined');
        }
        return Utils_1.Utils.decrypt(Utils_1.Utils.sha256(`${this.expires}.${secretKey}`), this.access_token);
    }
    get refreshToken() {
        const secretKey = process.env.SECRET_KEY;
        if (secretKey == undefined) {
            throw new Error('SECRET_KEY is undefined');
        }
        return Utils_1.Utils.decrypt(Utils_1.Utils.sha256(`${this.expires}.${secretKey}`), this.refresh_token);
    }
};
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatreonDocument.prototype, "access_token", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatreonDocument.prototype, "refresh_token", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatreonDocument.prototype, "scope", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Number)
], PatreonDocument.prototype, "expires_in", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", Date)
], PatreonDocument.prototype, "expires", void 0);
__decorate([
    mongot_2.prop,
    __metadata("design:type", String)
], PatreonDocument.prototype, "version", void 0);
__decorate([
    mongot_2.hook(mongot_1.Events.beforeUpdate),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PatreonDocument.prototype, "encryptSecrets", null);
__decorate([
    mongot_2.hook(mongot_1.Events.beforeUpdate),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PatreonDocument.prototype, "setExpires", null);
__decorate([
    mongot_2.virtual,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], PatreonDocument.prototype, "accessToken", null);
__decorate([
    mongot_2.virtual,
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], PatreonDocument.prototype, "refreshToken", null);
PatreonDocument = __decorate([
    mongot_2.document
], PatreonDocument);
exports.PatreonDocument = PatreonDocument;
//# sourceMappingURL=PatreonDocument.js.map