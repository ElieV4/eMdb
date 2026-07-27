"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
// Charge le .env de la racine monorepo pour que Prisma voie DATABASE_URL
// même quand @emdb/db est importé depuis apps/api ou apps/worker.
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, '..', '..', '.env') });
// Singleton : évite d'ouvrir une nouvelle pool de connexions Postgres
// à chaque import de @emdb/db dans apps/api ou apps/worker.
exports.prisma = new client_1.PrismaClient();
// Réexporte les types générés par Prisma (Title, User, etc.) pour que
// apps/api et apps/worker puissent les importer directement depuis @emdb/db.
__exportStar(require("@prisma/client"), exports);
// Fonctions PL/pgSQL (Phase 1.3) — à exposer côté API
// Ces fonctions appellent les fonctions PostgreSQL définies dans packages/db/sql/db_init.sql
__exportStar(require("./src/functions"), exports);
//# sourceMappingURL=index.js.map