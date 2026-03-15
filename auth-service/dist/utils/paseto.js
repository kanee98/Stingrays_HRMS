"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const crypto_1 = __importDefault(require("crypto"));
const paseto_1 = __importDefault(require("paseto"));
const { V3 } = paseto_1.default;
const PASETO_SECRET = process.env.PASETO_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';
/** Derive a 32-byte key for PASETO v3.local from env secret. */
function getSecretKey() {
    return crypto_1.default.createHash('sha256').update(PASETO_SECRET, 'utf8').digest();
}
async function signToken(payload) {
    const key = crypto_1.default.createSecretKey(getSecretKey());
    return V3.encrypt(payload, key, { expiresIn: '1h' });
}
async function verifyToken(token) {
    const key = crypto_1.default.createSecretKey(getSecretKey());
    const decoded = await V3.decrypt(token, key);
    return decoded;
}
