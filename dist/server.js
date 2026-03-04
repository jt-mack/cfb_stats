"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
require("./lib/cfbd-client"); // ensure CFBD client is configured with API key
const routes_1 = __importDefault(require("./routes"));
const port = process.env.PORT || 5000;
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
// CFB API: single base path; all sub-routes are mounted from routes/index
app.use('/api/cfb', routes_1.default);
// Frontend is served by Next.js: dev = "npm run client" (next dev), prod = "next start" in client-next.
// API is the only responsibility of this server.
app.listen(port, () => console.log(`Listening on port ${port}`));
