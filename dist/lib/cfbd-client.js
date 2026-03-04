"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
exports.getDefaultSeason = getDefaultSeason;
exports.unwrap = unwrap;
const dotenv_1 = __importDefault(require("dotenv"));
const cfbd_1 = require("cfbd");
Object.defineProperty(exports, "client", { enumerable: true, get: function () { return cfbd_1.client; } });
dotenv_1.default.config();
const apiKey = process.env.CFBDATA_APIKEY;
if (apiKey) {
    cfbd_1.client.setConfig({
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });
}
/**
 * Default season: current year, or previous year if before August.
 */
function getDefaultSeason() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return month <= 2 ? year - 1 : year;
}
/**
 * Unwrap CFBD SDK response: return data or throw.
 */
async function unwrap(promise) {
    const result = await promise;
    if (result.error) {
        throw result.error;
    }
    if (result.data === undefined) {
        throw new Error('No data in CFBD response');
    }
    return result.data;
}
