"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash = void 0;
const crypto_1 = require("crypto");
function hash(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
exports.hash = hash;
