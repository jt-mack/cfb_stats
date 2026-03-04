"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fbs_routes_1 = __importDefault(require("./fbs-routes"));
const conferences_routes_1 = __importDefault(require("./conferences-routes"));
const teams_routes_1 = __importDefault(require("./teams-routes"));
const games_routes_1 = __importDefault(require("./games-routes"));
/**
 * Routes index: mount all CFB API route modules. The /api/cfb prefix is
 * applied once when this router is mounted in server.ts.
 */
const router = (0, express_1.Router)();
router.use(fbs_routes_1.default);
router.use(conferences_routes_1.default);
router.use(teams_routes_1.default);
router.use(games_routes_1.default);
exports.default = router;
