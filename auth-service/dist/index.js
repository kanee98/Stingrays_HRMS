"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", users_routes_1.default);
const PORT = process.env.PORT || 4000;
// Initialize database connection before starting server
(0, db_1.ensureDbConnection)()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`Auth service running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
