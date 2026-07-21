// Standalone manual backup — WAL-safe consistent snapshot via VACUUM INTO.
// Usage: npm run backup   (or: node scripts/backup.mjs)
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.cwd(), "backups");
const DB_PATH = path.join(DATA_DIR, "ilhomdent.db");

if (!fs.existsSync(DB_PATH)) {
  console.error(`Baza topilmadi: ${DB_PATH}`);
  process.exit(1);
}
fs.mkdirSync(BACKUPS_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = path.join(BACKUPS_DIR, `ilhomdent-manual-${stamp}.db`);

const db = new DatabaseSync(DB_PATH);
if (fs.existsSync(dest)) fs.unlinkSync(dest);
db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);

// Verify integrity of the snapshot before reporting success.
const check = new DatabaseSync(dest).prepare("PRAGMA integrity_check").get();
db.close();

if (check && check.integrity_check === "ok") {
  console.log(`✅ Zaxira nusxa yaratildi va tekshirildi: ${dest}`);
} else {
  console.error("❌ Zaxira nusxa integrity tekshiruvidan o'tmadi!", check);
  process.exit(1);
}
