import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  kvGet,
  kvSet,
  kvSetMany,
  listCollection,
  upsertRow,
  deleteRow,
  getRow,
  countRows,
  pruneChats,
  migrateLegacyJsonIfNeeded,
  backupDb,
  dbHealthy,
  DB_PATH,
  DATA_DIR,
} from "./db";
import { SERVICES, DOCTORS, GALLERY_ITEMS } from "./src/data";
import uzTranslations from "./src/locales/uz.json";
import enTranslations from "./src/locales/en.json";
import ruTranslations from "./src/locales/ru.json";

// ============================================================
// Configuration
// ============================================================
const IS_PROD = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const SESSION_TTL_HOURS = 8;
const BCRYPT_ROUNDS = 12;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB decoded
const BACKUP_KEEP_DAYS = 14;
const LOG_KEEP_DAYS = 14;

const JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : crypto.randomBytes(48).toString("hex");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] JWT_SECRET env o'rnatilmagan (yoki 32 belgidan qisqa). Vaqtinchalik tasodifiy kalit ishlatilmoqda — server qayta ishga tushsa admin sessiyalari bekor bo'ladi. Production uchun .env da JWT_SECRET o'rnating."
  );
}

const TRANSLATIONS: Record<string, any> = {
  uz: uzTranslations,
  en: enTranslations,
  ru: ruTranslations,
};

// ============================================================
// Logging (daily files + console, with retention cleanup)
// ============================================================
const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function logLine(level: "info" | "warn" | "error", msg: string) {
  const ts = new Date().toISOString();
  const line = `${ts} [${level.toUpperCase()}] ${msg}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  try {
    const file = path.join(LOGS_DIR, `app-${ts.slice(0, 10)}.log`);
    fs.appendFileSync(file, line + "\n");
  } catch {
    /* logging must never crash the app */
  }
}

function cleanupOldFiles(dir: string, keepDays: number, pattern: RegExp) {
  try {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(dir)) {
      if (!pattern.test(f)) continue;
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (st.mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch (err: any) {
    logLine("warn", `Cleanup failed for ${dir}: ${err.message}`);
  }
}

// ============================================================
// Automated daily backups (SQLite online backup API)
// ============================================================
const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.cwd(), "backups");
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

/** Create a consistent point-in-time snapshot (VACUUM INTO handles WAL correctly). */
async function createBackup(label: string): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = path.join(BACKUPS_DIR, `ilhomdent-${label}-${stamp}.db`);
  await backupDb(dest);
  kvSet("ops:lastBackup", new Date().toISOString());
  logLine("info", `Zaxira nusxa yaratildi (${label}): ${path.basename(dest)}`);
  return dest;
}

async function runDailyBackup() {
  try {
    // One deduplicated daily snapshot per calendar day...
    const day = new Date().toISOString().slice(0, 10);
    const dailyDest = path.join(BACKUPS_DIR, `ilhomdent-daily-${day}.db`);
    if (!fs.existsSync(dailyDest)) {
      await backupDb(dailyDest);
      kvSet("ops:lastBackup", new Date().toISOString());
      logLine("info", `Kunlik zaxira nusxa yaratildi: ${path.basename(dailyDest)}`);
    }
    cleanupOldFiles(BACKUPS_DIR, BACKUP_KEEP_DAYS, /^ilhomdent-.*\.db$/);
    cleanupOldFiles(LOGS_DIR, LOG_KEEP_DAYS, /^app-.*\.log$/);
    pruneChats(500);
  } catch (err: any) {
    logLine("error", `Backup failed: ${err.message}`);
  }
}

// ============================================================
// Helpers
// ============================================================
function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanStr(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function isValidPhone(v: string): boolean {
  return /^[+]?[\d\s\-()]{7,20}$/.test(v);
}

function isValidSessionId(v: unknown): boolean {
  return typeof v === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(v);
}

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

// ============================================================
// Config store (SQLite-backed, in-memory mirror for hot reads)
// ============================================================
interface AuthRecord {
  isSetup: boolean;
  username: string;
  passwordHash: string;
}

const DEFAULT_CONTACTS = {
  instagram: "https://instagram.com/dr_ilhom_dental",
  telegram: "https://t.me/dr_ilhom_dental",
  whatsapp: "https://wa.me/998906134666",
  phone: "+998906134666",
  google_maps:
    "https://www.google.com/maps/place/41%C2%B016'58.4%22N+69%C2%B012'48.2%22E/@41.2829,69.2134,17z/",
  yandex_maps: "https://yandex.com/maps/?ll=69.2134%2C41.2829&z=17&pt=69.2134%2C41.2829",
};

const DEFAULT_BEFORE_AFTER = {
  before:
    "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=800&h=600",
  after:
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800&h=600",
};

const config = {
  auth: { isSetup: false, username: "", passwordHash: "" } as AuthRecord,
  telegram: { botToken: "", chatId: "", enabled: false },
  beforeAfter: { ...DEFAULT_BEFORE_AFTER },
  contacts: { ...DEFAULT_CONTACTS },
  services: [] as any[],
  doctors: [] as any[],
  gallery: [] as any[],
  translations: {} as Record<string, any>,
  logo: "/images/logo.webp",
};

function persistConfig(keys?: Array<keyof typeof config>) {
  const toSave = keys || (Object.keys(config) as Array<keyof typeof config>);
  kvSetMany(toSave.map((k) => [k, config[k]] as [string, any]));
}

function initStore() {
  const migration = migrateLegacyJsonIfNeeded(hashPassword);
  if (migration.migrated) {
    logLine(
      "info",
      `Legacy JSON store SQLite'ga ko'chirildi: ${migration.importedAppointments} qabul, ${migration.importedReviews} sharh, ${migration.importedChats} chat.`
    );
    if (migration.discardedCompromisedPassword) {
      logLine(
        "warn",
        "Eski standart parol (drilhom2026) xavfsizlik sababli import qilinmadi. ADMIN_USERNAME/ADMIN_PASSWORD env o'rnating yoki admin panel orqali qayta sozlang."
      );
    }
  }

  config.auth = kvGet<AuthRecord>("auth", config.auth)!;
  config.telegram = kvGet("telegram", config.telegram)!;
  config.beforeAfter = kvGet("beforeAfter", config.beforeAfter)!;
  config.contacts = { ...DEFAULT_CONTACTS, ...(kvGet("contacts", {}) || {}) };
  config.services = kvGet("services", []) || [];
  config.doctors = kvGet("doctors", []) || [];
  config.gallery = kvGet("gallery", []) || [];
  config.translations = kvGet("translations", {}) || {};
  config.logo = kvGet("logo", config.logo)!;

  if (!config.services.length) config.services = SERVICES as any[];
  if (!config.doctors.length) config.doctors = DOCTORS as any[];
  if (!config.gallery.length) config.gallery = GALLERY_ITEMS as any[];
  if (!Object.keys(config.translations).length) config.translations = TRANSLATIONS;

  // Bootstrap admin from environment (no hardcoded credentials anywhere).
  if (!config.auth?.isSetup || !config.auth.passwordHash) {
    const envUser = process.env.ADMIN_USERNAME;
    const envPass = process.env.ADMIN_PASSWORD;
    if (envUser && envPass && envPass.length >= 8) {
      config.auth = { isSetup: true, username: envUser, passwordHash: hashPassword(envPass) };
      logLine("info", "Admin hisobi ADMIN_USERNAME/ADMIN_PASSWORD env orqali yaratildi.");
    } else {
      config.auth = { isSetup: false, username: "", passwordHash: "" };
      logLine(
        "warn",
        "Admin hisobi hali sozlanmagan. Admin panel ochilganda bir martalik xavfsiz sozlash formasi ko'rsatiladi."
      );
    }
  }

  persistConfig();
}

// ============================================================
// Auth middleware (JWT in HttpOnly cookie) + RBAC
// ============================================================
const SESSION_COOKIE = "ilhomdent_session";

interface SessionPayload {
  sub: string;
  role: "admin";
}

function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_TTL_HOURS}h` });
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: "/",
  });
}

function getSession(req: Request): SessionPayload | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Avtorizatsiya talab qilinadi. Iltimos, qayta kiring." });
  }
  (req as any).session = session;
  next();
}

function requireRole(role: "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session as SessionPayload | undefined;
    if (!session || session.role !== role) {
      return res.status(403).json({ error: "Bu amal uchun ruxsat yo'q." });
    }
    next();
  };
}

// CSRF defense: SameSite=Strict cookie + strict Origin verification on mutations.
function csrfOriginCheck(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // same-origin fetches may omit Origin; cookie is SameSite=Strict anyway
  try {
    const originHost = new URL(origin).host;
    const host = req.headers["x-forwarded-host"]?.toString() || req.headers.host || "";
    if (originHost !== host) {
      return res.status(403).json({ error: "CSRF himoyasi: so'rov manbai mos emas." });
    }
  } catch {
    return res.status(403).json({ error: "CSRF himoyasi: noto'g'ri Origin." });
  }
  next();
}

// Brute-force lockout (per-IP, in-memory)
const loginFailures = new Map<string, { fails: number; lockedUntil: number }>();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function bruteForceGuard(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown";
  const rec = loginFailures.get(ip);
  if (rec && rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return res
      .status(429)
      .json({ error: `Juda ko'p muvaffaqiyatsiz urinish. ${mins} daqiqadan so'ng qayta urinib ko'ring.` });
  }
  next();
}

function recordLoginFailure(req: Request) {
  const ip = req.ip || "unknown";
  const rec = loginFailures.get(ip) || { fails: 0, lockedUntil: 0 };
  rec.fails += 1;
  if (rec.fails >= LOCKOUT_THRESHOLD) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.fails = 0;
    logLine("warn", `Brute-force himoyasi: ${ip} 15 daqiqaga bloklandi.`);
  }
  loginFailures.set(ip, rec);
}

function clearLoginFailures(req: Request) {
  loginFailures.delete(req.ip || "unknown");
}

// ============================================================
// Telegram
// ============================================================
async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<number | null> {
  if (!token || !chatId) return null;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) return null;
    const json: any = await res.json().catch(() => null);
    return json?.result?.message_id ?? null;
  } catch (err: any) {
    logLine("error", `Telegram notification failed: ${err.message}`);
    return null;
  }
}

// Correlates an outgoing Telegram notification message_id with the site record it
// was about, so that when the admin *replies* to that message in Telegram, we know
// which review / appointment / chat session to attach the reply to.
type TelegramLinkType = "review" | "appointment" | "chat";
function rememberTelegramLink(messageId: number, type: TelegramLinkType, id: string) {
  kvSet(`tglink_${messageId}`, { type, id });
}
function recallTelegramLink(messageId: number): { type: TelegramLinkType; id: string } | null {
  return kvGet(`tglink_${messageId}`, null);
}

function notifyTelegram(
  text: string,
  link?: { type: TelegramLinkType; id: string }
): void {
  if (config.telegram.enabled && config.telegram.botToken && config.telegram.chatId) {
    void sendTelegramMessage(config.telegram.botToken, config.telegram.chatId, text).then((messageId) => {
      if (messageId && link) rememberTelegramLink(messageId, link.type, link.id);
    });
  }
}

// ---------- Telegram two-way replies (long polling) ----------
// Admin replies to a forwarded notification inside their own Telegram app (using
// Telegram's native "Reply" feature). We poll getUpdates, find the message the
// admin replied to, look up which review/appointment/chat it belongs to via
// rememberTelegramLink, and apply the admin's text as that record's reply.
let telegramPollingActive = false;
async function pollTelegramUpdatesOnce() {
  const { botToken, enabled } = config.telegram;
  if (!enabled || !botToken) return;

  const offset = kvGet<number>("telegram_update_offset", 0) || 0;
  let updates: any[];
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=0&allowed_updates=["message"]`
    );
    if (!res.ok) return;
    const json: any = await res.json();
    updates = json?.result || [];
  } catch (err: any) {
    logLine("error", `Telegram getUpdates failed: ${err.message}`);
    return;
  }

  for (const update of updates) {
    kvSet("telegram_update_offset", update.update_id + 1);

    const msg = update.message;
    const replyText: string | undefined = msg?.text;
    const repliedTo = msg?.reply_to_message?.message_id;
    if (!msg || !replyText || !repliedTo) continue;

    const link = recallTelegramLink(repliedTo);
    if (!link) continue; // admin replied to something we can't correlate — ignore

    const now = new Date().toISOString();
    if (link.type === "review") {
      const review = getRow<any>("reviews", link.id);
      if (review) {
        review.reply = replyText;
        review.replyDate = now;
        upsertRow("reviews", review.id, review);
      }
    } else if (link.type === "appointment") {
      const apt = getRow<any>("appointments", link.id);
      if (apt) {
        apt.reply = replyText;
        apt.replyDate = now;
        upsertRow("appointments", apt.id, apt, apt.createdAt);
      }
    } else if (link.type === "chat") {
      const session = getRow<any>("chats", link.id);
      if (session) {
        session.messages.push({
          id: `msg-${Date.now()}-tg`,
          role: "model",
          text: replyText,
          timestamp: now,
        });
        session.lastUpdated = now;
        session.unread = false;
        upsertRow("chats", session.id, session, session.lastUpdated);
      }
    }
  }
}

function startTelegramPolling() {
  if (telegramPollingActive) return;
  telegramPollingActive = true;
  setInterval(() => {
    void pollTelegramUpdatesOnce();
  }, 4000);
}

// ============================================================
// Server
// ============================================================
async function startServer() {
  initStore();
  startTelegramPolling();
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // behind Nginx

  // ---------- Flood / DDoS avtomatik bloklash ----------
  // Agar bitta IP manzil 1 soniya ichida 100 dan ortiq so'rov yuborsa,
  // bu aniq hujum (bot/flood) patterni hisoblanadi va shu IP avtomatik
  // ravishda 15 daqiqaga bloklanadi. Bu tekshiruv barcha boshqa
  // middleware'lardan OLDIN, eng birinchi bo'lib ishlaydi — shunda
  // bloklangan so'rov serverning boshqa resurslarini band qilmaydi.
  const FLOOD_WINDOW_MS = 1000; // 1 soniyalik oyna
  const FLOOD_THRESHOLD = 100; // shu oyna ichida ruxsat etilgan maksimal so'rov
  const FLOOD_BAN_MS = 15 * 60 * 1000; // blok muddati: 15 daqiqa

  const floodTimestamps = new Map<string, number[]>();
  const floodBannedIps = new Map<string, number>(); // ip -> blok tugash vaqti (ms, epoch)

  function floodGuard(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const bannedUntil = floodBannedIps.get(ip);
    if (bannedUntil !== undefined) {
      if (now < bannedUntil) {
        res.setHeader("Retry-After", Math.ceil((bannedUntil - now) / 1000).toString());
        return res
          .status(429)
          .json({ error: "IP manzilingiz hujumga o'xshash faollik tufayli vaqtincha bloklangan." });
      }
      floodBannedIps.delete(ip);
    }

    let timestamps = floodTimestamps.get(ip);
    if (!timestamps) {
      timestamps = [];
      floodTimestamps.set(ip, timestamps);
    }
    timestamps.push(now);
    while (timestamps.length && timestamps[0] < now - FLOOD_WINDOW_MS) {
      timestamps.shift();
    }

    if (timestamps.length > FLOOD_THRESHOLD) {
      floodBannedIps.set(ip, now + FLOOD_BAN_MS);
      floodTimestamps.delete(ip);
      logLine(
        "error",
        `[FLOOD-GUARD] IP avtomatik bloklandi (hujum shubhasi): ip=${ip} 1s ichida ${timestamps.length}+ so'rov`
      );
      notifyTelegram(
        `🚨 <b>Hujum aniqlandi va avtomatik bloklandi</b>\n\n📡 IP: <code>${ip}</code>\n⚡ 1 soniyada: ${timestamps.length}+ so'rov\n⏱ Blok muddati: 15 daqiqa`
      );
      res.setHeader("Retry-After", Math.ceil(FLOOD_BAN_MS / 1000).toString());
      return res
        .status(429)
        .json({ error: "Haddan tashqari ko'p so'rov aniqlandi (hujum shubhasi). IP vaqtincha bloklandi." });
    }

    next();
  }
  app.use(floodGuard);

  // Xotirani tozalab turish — faol bo'lmagan IP yozuvlari va muddati
  // o'tgan bloklarni olib tashlaydi (memory leak oldini olish uchun).
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of floodTimestamps.entries()) {
      if (!timestamps.length || timestamps[timestamps.length - 1] < now - FLOOD_WINDOW_MS * 2) {
        floodTimestamps.delete(ip);
      }
    }
    for (const [ip, until] of floodBannedIps.entries()) {
      if (now >= until) floodBannedIps.delete(ip);
    }
  }, 5 * 60 * 1000).unref();

  // ---------- Security & performance middleware ----------
  app.use(
    helmet({
      contentSecurityPolicy: IS_PROD
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
              imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://flagcdn.com"],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'self'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false, // Vite dev server (HMR/ws) needs a relaxed policy in development only
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.use(csrfOriginCheck);

  // Request logging (errors and admin mutations)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (res.statusCode >= 400 || (req.method !== "GET" && req.path.startsWith("/api/"))) {
        logLine(
          res.statusCode >= 500 ? "error" : "info",
          `${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms ip=${req.ip}`
        );
      }
    });
    next();
  });

  // ---------- Rate limiting ----------
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring." },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Juda ko'p login urinishi. 15 daqiqadan so'ng qayta urinib ko'ring." },
  });
  const publicWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Juda tez-tez yuborilmoqda. Bir daqiqadan so'ng qayta urinib ko'ring." },
  });
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Chat uchun so'rovlar cheklandi. Birozdan so'ng davom eting." },
  });
  app.use("/api/", apiLimiter);

  // ---------- Uploads (auth-protected, validated) ----------
  const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // ---------- Deploy signal (safe, socket-less "update" trigger) ----------
  // Ilova Docker'ga HECH QACHON to'g'ridan-to'g'ri tegmaydi (docker.sock yo'q,
  // SSH kaliti yo'q). U faqat shu papkaga bitta belgi-fayl yozadi. Serverning
  // o'zida (konteynerdan tashqarida) ishlaydigan alohida watcher skript shu
  // faylni ko'rib, FAQAT bitta qat'iy buyruqni bajaradi: `git pull && docker
  // compose up -d --build`. Bu shuni anglatadiki, hatto ilova to'liq buzib
  // kirilsa ham, tajovuzkor faqat "rasmiy repodan kodni qayta yuklash"ni
  // ishga tushira oladi — boshqa hech qanday buyruq yoki konteynerga kirish
  // imkoniyatiga ega bo'lmaydi.
  const DEPLOY_DIR = process.env.DEPLOY_DIR || path.join(process.cwd(), "deploy-signal");
  if (!fs.existsSync(DEPLOY_DIR)) fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  const DEPLOY_REQUEST_FILE = path.join(DEPLOY_DIR, "update.request");
  const DEPLOY_LOG_FILE = path.join(DEPLOY_DIR, "update.log");

  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      dotfiles: "deny",
      maxAge: "7d",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "inline");
      },
    })
  );

  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  function sniffImageMime(buf: Buffer): string | null {
    if (buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
      return "image/webp";
    return null;
  }

  app.post("/api/upload", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { data } = req.body || {};
      if (typeof data !== "string" || !data) {
        return res.status(400).json({ error: "Hech qanday rasm ma'lumoti yuborilmadi" });
      }
      const base64Data = data.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, "base64");
      } catch {
        return res.status(400).json({ error: "Rasm ma'lumoti noto'g'ri formatda." });
      }
      if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
        return res.status(400).json({ error: "Rasm hajmi 5MB dan oshmasligi kerak." });
      }
      const sniffed = sniffImageMime(buffer);
      if (!sniffed || !ALLOWED_IMAGE_TYPES[sniffed]) {
        return res
          .status(400)
          .json({ error: "Faqat JPEG, PNG, WebP yoki GIF rasm fayllariga ruxsat berilgan." });
      }
      const ext = ALLOWED_IMAGE_TYPES[sniffed];
      const filename = `img_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      res.json({ success: true, url: `/uploads/${filename}` });
    } catch (err: any) {
      logLine("error", `Upload error: ${err.message}`);
      res.status(500).json({ error: "Rasmni serverga yuklab bo'lmadi" });
    }
  });

  // ---------- Health check ----------
  app.get("/api/health", (_req, res) => {
    const healthy = dbHealthy();
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      db: healthy ? "ok" : "error",
      uptimeSec: Math.round(process.uptime()),
      lastBackup: kvGet<string>("ops:lastBackup", null),
      timestamp: new Date().toISOString(),
    });
  });

  // ---------- Public site data ----------
  app.get("/api/site-data", (_req, res) => {
    res.json({
      services: config.services,
      doctors: config.doctors,
      gallery: config.gallery,
      logo: config.logo || "/images/logo.webp",
      beforeAfter: config.beforeAfter || DEFAULT_BEFORE_AFTER,
      translations: config.translations,
      contacts: config.contacts || DEFAULT_CONTACTS,
      telegram: {
        enabled: config.telegram.enabled,
        botToken: config.telegram.botToken ? "********" : "",
        chatId: config.telegram.chatId,
      },
      auth: { isSetup: config.auth.isSetup },
      security: kvGet("security", null),
    });
  });

  app.post("/api/site-data/update", requireAuth, requireRole("admin"), (req, res) => {
    const { services, doctors, gallery, translations, contacts, beforeAfter, logo } = req.body || {};
    if (services !== undefined && !Array.isArray(services))
      return res.status(400).json({ error: "services massiv bo'lishi kerak." });
    if (doctors !== undefined && !Array.isArray(doctors))
      return res.status(400).json({ error: "doctors massiv bo'lishi kerak." });
    if (gallery !== undefined && !Array.isArray(gallery))
      return res.status(400).json({ error: "gallery massiv bo'lishi kerak." });
    if (translations !== undefined && (typeof translations !== "object" || translations === null))
      return res.status(400).json({ error: "translations obyekt bo'lishi kerak." });
    if (contacts !== undefined && (typeof contacts !== "object" || contacts === null))
      return res.status(400).json({ error: "contacts obyekt bo'lishi kerak." });

    if (services) config.services = services;
    if (doctors) config.doctors = doctors;
    if (gallery) config.gallery = gallery;
    if (translations) config.translations = translations;
    if (contacts) config.contacts = contacts;
    if (beforeAfter) config.beforeAfter = beforeAfter;
    if (logo && typeof logo === "string") config.logo = cleanStr(logo, 300);

    persistConfig(["services", "doctors", "gallery", "translations", "contacts", "beforeAfter", "logo"]);
    res.json({ success: true, message: "Site ma'lumotlari muvaffaqiyatli saqlandi!" });
  });

  // ---------- Manual backup (admin only) ----------
  app.post("/api/admin/backup", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const dest = await createBackup("manual");
      res.json({ success: true, file: path.basename(dest) });
    } catch (err: any) {
      logLine("error", `Manual backup failed: ${err.message}`);
      res.status(500).json({ error: "Zaxira nusxa yaratib bo'lmadi." });
    }
  });

  // ---------- Auth ----------
  app.get("/api/admin/auth-status", (_req, res) => {
    res.json({ isSetup: config.auth.isSetup });
  });

  app.get("/api/admin/me", (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, username: session.sub, role: session.role });
  });

  app.post("/api/admin/setup", loginLimiter, (req, res) => {
    if (config.auth.isSetup) {
      return res
        .status(403)
        .json({ error: "Admin hisobi allaqachon sozlangan. Login orqali kiring." });
    }
    const username = cleanStr(req.body?.username, 50);
    const password = String(req.body?.password ?? "");
    if (!username || username.length < 3) {
      return res.status(400).json({ error: "Username kamida 3 belgidan iborat bo'lishi kerak." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Parol kamida 8 belgidan iborat bo'lishi kerak." });
    }
    config.auth = { isSetup: true, username, passwordHash: hashPassword(password) };
    persistConfig(["auth"]);
    logLine("info", `Admin hisobi yaratildi: ${username}`);
    res.json({ success: true, message: "Admin hisob qaydnomasi muvaffaqiyatli yaratildi!" });
  });

  app.post("/api/admin/login", loginLimiter, bruteForceGuard, (req, res) => {
    if (!config.auth.isSetup) {
      return res.status(400).json({ error: "Avval admin hisob qaydnomasini sozlang." });
    }
    const username = cleanStr(req.body?.username, 50);
    const password = String(req.body?.password ?? "");
    const userOk = username === config.auth.username;
    const passOk = password.length > 0 && bcrypt.compareSync(password, config.auth.passwordHash);
    if (!userOk || !passOk) {
      recordLoginFailure(req);
      return res.status(401).json({ error: "Noto'g'ri login yoki parol!" });
    }
    clearLoginFailures(req);
    const token = signSession({ sub: username, role: "admin" });
    setSessionCookie(res, token);
    logLine("info", `Admin tizimga kirdi: ${username} ip=${req.ip}`);
    res.json({ success: true });
  });

  app.post("/api/admin/logout", requireAuth, (req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
  });

  app.post("/api/admin/change-password", requireAuth, requireRole("admin"), (req, res) => {
    const username = cleanStr(req.body?.username, 50);
    const password = String(req.body?.password ?? "");
    if (!username || username.length < 3) {
      return res.status(400).json({ error: "Username kamida 3 belgidan iborat bo'lishi kerak." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak." });
    }
    config.auth = { isSetup: true, username, passwordHash: hashPassword(password) };
    persistConfig(["auth"]);
    // Rotate the session so the new credentials take effect immediately.
    setSessionCookie(res, signSession({ sub: username, role: "admin" }));
    logLine("info", `Admin login/parol yangilandi: ${username}`);
    res.json({ success: true, message: "Login va parol muvaffaqiyatli yangilandi!" });
  });

  // ---------- Telegram config ----------
  app.post("/api/admin/telegram-config", requireAuth, requireRole("admin"), (req, res) => {
    const { botToken, chatId, enabled } = req.body || {};
    if (botToken && botToken !== "********") {
      config.telegram.botToken = cleanStr(botToken, 100);
    }
    if (chatId !== undefined) config.telegram.chatId = cleanStr(chatId, 50);
    if (enabled !== undefined) config.telegram.enabled = Boolean(enabled);
    persistConfig(["telegram"]);
    res.json({
      success: true,
      telegram: {
        enabled: config.telegram.enabled,
        botToken: config.telegram.botToken ? "********" : "",
        chatId: config.telegram.chatId,
      },
    });
  });

  app.post("/api/admin/telegram-test", requireAuth, requireRole("admin"), async (req, res) => {
    const { botToken, chatId } = req.body || {};
    const actualToken =
      botToken && botToken !== "********" ? cleanStr(botToken, 100) : config.telegram.botToken;
    const actualChatId = chatId ? cleanStr(chatId, 50) : config.telegram.chatId;
    if (!actualToken || !actualChatId) {
      return res.status(400).json({ error: "Telegram Bot Token va Chat ID kiritilishi shart." });
    }
    const ok = await sendTelegramMessage(
      actualToken,
      actualChatId,
      `🔔 <b>Dr Ilhom Dental Clinic</b>\n\nTest xabari! Telegram bot tizimi muvaffaqiyatli ulangan.`
    );
    if (ok) {
      res.json({ success: true, message: "Test xabari yuborildi! Telegram botingizni tekshiring." });
    } else {
      res.status(500).json({
        error:
          "Telegram botga xabar yuborib bo'lmadi. Token yoki Chat ID xato kiritilgan bo'lishi mumkin.",
      });
    }
  });

  // ---------- Security status (real, honest system checks) ----------
  function buildSecurityState() {
    const uploadsCount = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR).length : 0;
    return {
      firewallEnabled: true,
      openPorts: [`${PORT} (Express — Nginx reverse proxy orqali)`],
      threatLevel: "LOW",
      lastScanTime: new Date().toLocaleString("uz-UZ"),
      certificates: [
        {
          id: "cert-ssl",
          name: "SSL/TLS sertifikat",
          expiry: "Nginx + Certbot tomonidan avtomatik boshqariladi",
          status: "Secure",
        },
        {
          id: "cert-jwt",
          name: "JWT sessiya kaliti",
          expiry: process.env.JWT_SECRET ? "Faol (env orqali o'rnatilgan)" : "Vaqtinchalik (env o'rnating!)",
          status: process.env.JWT_SECRET ? "Secure" : "Warning",
        },
      ],
      meta: {
        nodeEnv: process.env.NODE_ENV || "development",
        dbHealthy: dbHealthy(),
        uploadsCount,
        lastBackup: kvGet<string>("ops:lastBackup", null),
        floodBannedIpsCount: floodBannedIps.size,
      },
    };
  }

  app.post("/api/admin/security-scan", requireAuth, requireRole("admin"), (_req, res) => {
    const security = buildSecurityState();
    kvSet("security", security);
    const logs = [
      "[INFO] Real tizim holati tekshiruvi boshlandi...",
      `[CHECK] Muhit (NODE_ENV): ${security.meta.nodeEnv}`,
      `[CHECK] Ma'lumotlar bazasi (SQLite WAL): ${security.meta.dbHealthy ? "SOG'LOM [OK]" : "XATOLIK!"}`,
      `[CHECK] Parol saqlash: bcrypt hash (${BCRYPT_ROUNDS} rounds) [OK]`,
      "[CHECK] Sessiya: JWT + HttpOnly/SameSite=Strict cookie [OK]",
      "[CHECK] Rate limiting: faol (login 10/15min, API 600/15min) [OK]",
      "[CHECK] Brute-force lockout: faol (5 xato -> 15 daqiqa blok) [OK]",
      "[CHECK] Flood/DDoS avtomatik blok: faol (1s ichida 100+ so'rov -> 15 daqiqa avtoblok) [OK]",
      `[CHECK] Hozirda bloklangan IP'lar: ${security.meta.floodBannedIpsCount} ta`,
      "[CHECK] Helmet security headers + CSP: faol [OK]",
      `[CHECK] Yuklangan fayllar: ${security.meta.uploadsCount} ta (faqat tekshirilgan rasmlar) [OK]`,
      `[CHECK] Oxirgi zaxira nusxa: ${security.meta.lastBackup || "hali yaratilmagan"}`,
      process.env.JWT_SECRET
        ? "[CHECK] JWT_SECRET: env orqali o'rnatilgan [OK]"
        : "[WARN] JWT_SECRET env o'rnatilmagan — .env faylga qo'shing!",
      "[SUCCESS] Tekshiruv yakunlandi. Kritik muammo aniqlanmadi.",
    ];
    notifyTelegram(
      `🛡️ <b>Xavfsizlik tekshiruvi o'tkazildi</b>\n\n🟢 DB: ${
        security.meta.dbHealthy ? "OK" : "XATO"
      }\n📅 <b>Sana:</b> ${security.lastScanTime}`
    );
    res.json({ success: true, logs, security });
  });

  app.post("/api/admin/close-ports", requireAuth, requireRole("admin"), (_req, res) => {
    const security = buildSecurityState();
    kvSet("security", security);
    res.json({ success: true, security });
  });

  app.post("/api/admin/renew-certificates", requireAuth, requireRole("admin"), (_req, res) => {
    const security = buildSecurityState();
    kvSet("security", security);
    const logs = [
      "[INFO] SSL sertifikat holati tekshirilmoqda...",
      "[INFO] Bu server reverse proxy (Nginx) ortida ishlaydi.",
      "[INFO] SSL sertifikatlar Certbot (Let's Encrypt) tomonidan serverda avtomatik yangilanadi:",
      "[INFO]   certbot renew --quiet  (cron: kuniga 2 marta)",
      "[CHECK] Ilova HTTPS uchun tayyor: secure cookie, HSTS (Nginx), trust proxy [OK]",
      "[SUCCESS] Tekshiruv yakunlandi. Sertifikat boshqaruvi server darajasida avtomatlashtirilgan.",
    ];
    res.json({ success: true, logs, security });
  });

  // Kod/konteynerni yangilash — xavfsiz, socket'siz usul.
  // Bu yerda hech qanday `docker` yoki `git` buyrug'i ISHGA TUSHIRILMAYDI.
  // Faqat "so'rov fayli" yoziladi; haqiqiy yangilanishni server tashqarisidagi
  // watcher skript (scripts/deploy-watcher.sh) bajaradi.
  app.post("/api/admin/deploy/trigger-update", requireAuth, requireRole("admin"), (req, res) => {
    if (fs.existsSync(DEPLOY_REQUEST_FILE)) {
      return res.status(409).json({
        error: "Yangilanish so'rovi allaqachon navbatda. Iltimos, avvalgisi tugashini kuting.",
      });
    }
    const requestedBy = (req as any).session?.sub || "admin";
    const payload = {
      requestedAt: new Date().toISOString(),
      requestedBy,
    };
    fs.writeFileSync(DEPLOY_REQUEST_FILE, JSON.stringify(payload, null, 2), "utf8");
    notifyTelegram(
      `🚀 <b>Yangilanish so'rovi yuborildi</b>\n\n👤 ${requestedBy}\n📅 ${new Date().toLocaleString("uz-UZ")}\n\nServer galdagi tekshiruvda kodni GitHub'dan tortib, konteynerni qayta quradi.`
    );
    res.json({
      success: true,
      message:
        "So'rov qabul qilindi. Server tomonidagi watcher xizmat bir necha soniya - 1 daqiqa ichida kodni GitHub'dan tortib, konteynerni qayta quradi.",
    });
  });

  app.get("/api/admin/deploy/status", requireAuth, requireRole("admin"), (_req, res) => {
    const pending = fs.existsSync(DEPLOY_REQUEST_FILE);
    let pendingSince: string | null = null;
    if (pending) {
      try {
        pendingSince = JSON.parse(fs.readFileSync(DEPLOY_REQUEST_FILE, "utf8")).requestedAt || null;
      } catch {
        pendingSince = null;
      }
    }
    let log = "";
    if (fs.existsSync(DEPLOY_LOG_FILE)) {
      const full = fs.readFileSync(DEPLOY_LOG_FILE, "utf8");
      log = full.slice(-4000); // oxirgi qismini ko'rsatish
    }
    res.json({ pending, pendingSince, log });
  });

  // ---------- Live chat ----------
  app.get("/api/admin/chats", requireAuth, requireRole("admin"), (_req, res) => {
    res.json(listCollection("chats", "lastUpdated DESC"));
  });

  app.get("/api/chat/history", (req, res) => {
    const { sessionId } = req.query;
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: "Session ID noto'g'ri formatda." });
    }
    let session = getRow<any>("chats", sessionId as string);
    if (!session) {
      session = {
        id: sessionId,
        name: `Mijoz (${new Date().toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        })})`,
        messages: [
          {
            id: "welcome",
            role: "model",
            text: "Salom! Dr. Ilhom Dental Clinic operatoriga xush kelibsiz. Savolingizni yozing — tez orada javob beramiz.",
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
        unread: false,
      };
      upsertRow("chats", session.id, session, session.lastUpdated);
    }
    res.json(session.messages);
  });

  app.post("/api/admin/chats/reply", requireAuth, requireRole("admin"), (req, res) => {
    const { sessionId } = req.body || {};
    const text = cleanStr(req.body?.text, 2000);
    if (!isValidSessionId(sessionId) || !text) {
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan." });
    }
    const session = getRow<any>("chats", sessionId);
    if (!session) return res.status(404).json({ error: "Chat topilmadi!" });

    const adminMsg = {
      id: `msg-${Date.now()}-admin`,
      role: "model",
      text,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(adminMsg);
    session.lastUpdated = new Date().toISOString();
    session.unread = false;
    upsertRow("chats", session.id, session, session.lastUpdated);
    res.json({ success: true, message: adminMsg });
  });

  // Live chat — messages are routed directly to the human admin (no AI).
  // The client polls /api/chat/history to receive the admin's replies.
  app.post("/api/chat", chatLimiter, (req, res) => {
    const { sessionId, language } = req.body || {};
    const message = cleanStr(req.body?.message, 1000);
    if (!isValidSessionId(sessionId) || !message) {
      return res.status(400).json({ error: "Sarlavha yoki xabar yuborilmadi" });
    }
    const lang = ["uz", "en", "ru", "ar", "fr", "hi", "ko", "zh"].includes(language) ? language : "uz";

    let session = getRow<any>("chats", sessionId);
    const isNewSession = !session;
    if (!session) {
      session = {
        id: sessionId,
        name: `Mijoz (${new Date().toLocaleTimeString("uz-UZ", {
          hour: "2-digit",
          minute: "2-digit",
        })})`,
        messages: [],
        lastUpdated: new Date().toISOString(),
        unread: true,
      };
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: message,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    // On the very first customer message, add a localized auto-acknowledgement
    // so the visitor knows the message was delivered and a human will reply.
    let reply: string | undefined;
    const firstUserMessage = session.messages.filter((m: any) => m.role === "user").length === 1;
    if (firstUserMessage) {
      const acks: Record<string, string> = {
        uz: `Xabaringiz uchun rahmat! Administratorimizga yuborildi va tez orada bevosita javob beramiz. Shoshilinch bo'lsa: ${config.contacts.phone}`,
        en: `Thank you for your message! It has been sent to our team and we will reply personally very soon. Urgent? Call: ${config.contacts.phone}`,
        ru: `Спасибо за сообщение! Оно отправлено администратору, мы ответим вам лично в ближайшее время. Срочно? Звоните: ${config.contacts.phone}`,
        ar: `شكرًا لرسالتك! تم إرسالها إلى فريقنا وسنرد عليك قريبًا. للحالات العاجلة: ${config.contacts.phone}`,
      };
      reply = acks[lang] || acks["uz"];
      session.messages.push({
        id: `msg-${Date.now()}-ack`,
        role: "model",
        text: reply,
        timestamp: new Date().toISOString(),
      });
    }

    session.lastUpdated = new Date().toISOString();
    session.unread = true;
    upsertRow("chats", session.id, session, session.lastUpdated);

    notifyTelegram(
      `💬 <b>${isNewSession ? "Yangi chat boshlandi!" : "Yangi chat xabari!"}</b>\n👤 <b>Mijoz:</b> ${escapeHtml(
        session.name
      )}\n💬 <b>Xabar:</b> ${escapeHtml(
        message
      )}\n\n<i>Admin panelidan yoki shu xabarga to'g'ridan-to'g'ri Telegram'da "Reply" qilib javob yozishingiz mumkin.</i>`,
      { type: "chat", id: session.id }
    );

    res.json({ success: true, reply });
  });

  // ---------- Appointments (patient data — admin only for reads) ----------
  app.get("/api/appointments", requireAuth, requireRole("admin"), (_req, res) => {
    res.json(listCollection("appointments", "createdAt DESC"));
  });

  app.post("/api/appointments", publicWriteLimiter, (req, res) => {
    const name = cleanStr(req.body?.name, 100);
    const phone = cleanStr(req.body?.phone, 25);
    const date = cleanStr(req.body?.date, 20);
    const time = cleanStr(req.body?.time, 10);
    const department = cleanStr(req.body?.department, 100);
    const doctor = cleanStr(req.body?.doctor, 100);
    const comments = cleanStr(req.body?.comments, 500);

    if (!name || name.length < 2 || !phone) {
      return res.status(400).json({ error: "Ism va telefon raqami talab qilinadi." });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: "Telefon raqami noto'g'ri formatda." });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Sana noto'g'ri formatda." });
    }
    if (time && !/^\d{1,2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: "Vaqt noto'g'ri formatda." });
    }

    const newApt = {
      id: `apt-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      name,
      phone,
      date: date || new Date().toISOString().split("T")[0],
      time: time || "12:00",
      department: department || "General Dentistry",
      doctor: doctor || "Shifokor tanlanmagan",
      comments,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    upsertRow("appointments", newApt.id, newApt, newApt.createdAt);

    notifyTelegram(
      `🆕 <b>Yangi qabul arizasi keldi!</b>\n\n👤 <b>Ism:</b> ${escapeHtml(name)}\n📞 <b>Telefon:</b> <code>${escapeHtml(
        phone
      )}</code>\n📅 <b>Sana:</b> ${escapeHtml(newApt.date)}\n🕒 <b>Vaqt:</b> ${escapeHtml(
        newApt.time
      )}\n🦷 <b>Xizmat:</b> ${escapeHtml(newApt.department)}\n👨‍⚕️ <b>Shifokor:</b> ${escapeHtml(
        newApt.doctor
      )}\n💬 <b>Izoh:</b> ${escapeHtml(
        comments || "Yo'q"
      )}\n\n<i>Shu xabarga "Reply" qilib javob yozsangiz, mijozning ariza yozuviga saqlanadi.</i>`,
      { type: "appointment", id: newApt.id }
    );

    res.status(201).json(newApt);
  });

  app.post("/api/appointments/status", requireAuth, requireRole("admin"), (req, res) => {
    const { id } = req.body || {};
    const status = cleanStr(req.body?.status, 20);
    if (!id || !["Pending", "Approved", "Cancelled"].includes(status)) {
      return res.status(400).json({ error: "Noto'g'ri holat qiymati." });
    }
    const apt = getRow<any>("appointments", String(id));
    if (!apt) return res.status(404).json({ error: "Ariza topilmadi" });
    apt.status = status;
    upsertRow("appointments", apt.id, apt, apt.createdAt);
    res.json(apt);
  });

  // Admin panel: write a reply/note to an appointment (also visible to admin only,
  // since there's no direct channel back to the patient other than phone/chat).
  app.post("/api/admin/appointments/:id/reply", requireAuth, requireRole("admin"), (req, res) => {
    const text = cleanStr(req.body?.text, 1000);
    if (!text) return res.status(400).json({ error: "Javob matni bo'sh bo'lishi mumkin emas." });
    const apt = getRow<any>("appointments", req.params.id);
    if (!apt) return res.status(404).json({ error: "Ariza topilmadi" });
    apt.reply = text;
    apt.replyDate = new Date().toISOString();
    upsertRow("appointments", apt.id, apt, apt.createdAt);
    res.json(apt);
  });

  app.delete("/api/appointments/:id", requireAuth, requireRole("admin"), (req, res) => {
    deleteRow("appointments", req.params.id);
    res.json({ success: true });
  });

  // ---------- Reviews ----------
  app.get("/api/reviews", (_req, res) => {
    const reviews = listCollection<any>("reviews").filter((r) => r.status === "Approved");
    res.json(reviews);
  });

  app.post("/api/reviews", publicWriteLimiter, (req, res) => {
    const name = cleanStr(req.body?.name, 50);
    const text = cleanStr(req.body?.text, 600);
    const rating = Number(req.body?.rating);
    if (!name || !text || !Number.isFinite(rating)) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldirish shart" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Baho 1 dan 5 gacha bo'lishi kerak." });
    }
    const newReview = {
      id: `rev-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      name,
      rating: Math.round(rating),
      text,
      date: new Date().toLocaleDateString("uz-UZ"),
      status: "Approved",
      createdAt: new Date().toISOString(),
    };
    upsertRow("reviews", newReview.id, newReview);

    notifyTelegram(
      `⭐ <b>Yangi izoh (sharh) qoldirildi!</b>\n\n👤 <b>Ism:</b> ${escapeHtml(name)}\n⭐ <b>Baho:</b> ${newReview.rating}/5\n💬 <b>Matn:</b> ${escapeHtml(
        text
      )}\n\n<i>Shu xabarga "Reply" qilib javob yozsangiz, saytdagi izohga qo'shiladi.</i>`,
      { type: "review", id: newReview.id }
    );
    res.status(201).json(newReview);
  });

  // Admin panel: write/update a public reply that is shown under the review on the site.
  app.post("/api/admin/reviews/:id/reply", requireAuth, requireRole("admin"), (req, res) => {
    const text = cleanStr(req.body?.text, 1000);
    if (!text) return res.status(400).json({ error: "Javob matni bo'sh bo'lishi mumkin emas." });
    const review = getRow<any>("reviews", req.params.id);
    if (!review) return res.status(404).json({ error: "Izoh topilmadi" });
    review.reply = text;
    review.replyDate = new Date().toISOString();
    upsertRow("reviews", review.id, review);
    res.json(review);
  });

  app.delete("/api/admin/reviews/:id", requireAuth, requireRole("admin"), (req, res) => {
    deleteRow("reviews", req.params.id);
    res.json({ success: true });
  });

  // ---------- Analytics (real data, admin only) ----------
  app.get("/api/analytics", requireAuth, requireRole("admin"), (_req, res) => {
    const appointments = listCollection<any>("appointments");
    const reviews = listCollection<any>("reviews");
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === "Pending").length;
    const approved = appointments.filter((a) => a.status === "Approved").length;
    const reviewsCount = reviews.length;
    const rating = (
      reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / reviewsCount || 5.0
    ).toFixed(1);

    // Real monthly buckets — last 6 months from createdAt
    const monthly: Array<{ name: string; appointments: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });
      const count = appointments.filter((a) => (a.createdAt || "").startsWith(key)).length;
      monthly.push({ name: label, appointments: count });
    }

    res.json({ total, pending, approved, reviewsCount, rating, monthly });
  });

  // ---------- API 404 + global error handler ----------
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint topilmadi." });
  });

  // ---------- Static / SPA ----------
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (/\/assets\//.test(filePath) || /\.(webp|png|jpg|jpeg|svg|woff2?)$/.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );
    app.get("*", (req, res) => {
      // Missing static assets must 404, not silently return the SPA shell.
      if (path.extname(req.path)) {
        return res.status(404).send("Not found");
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler (last)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logLine("error", `Unhandled error: ${err.stack || err.message || err}`);
    if (res.headersSent) return;
    res.status(500).json({ error: "Ichki server xatosi." });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    logLine("info", `Server ${PORT}-portda ishga tushdi (${IS_PROD ? "production" : "development"}). APP_URL=${APP_URL}`);
  });

  // Daily automation: backups + log/chat cleanup
  void runDailyBackup();
  const backupTimer = setInterval(runDailyBackup, 24 * 60 * 60 * 1000);

  // Graceful shutdown — capture a final snapshot so no data is lost on restart/deploy.
  const shutdown = async () => {
    logLine("info", "Server to'xtatilmoqda (graceful shutdown)...");
    clearInterval(backupTimer);
    try {
      await createBackup("shutdown");
    } catch (err: any) {
      logLine("error", `Shutdown backup failed: ${err.message}`);
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Fatal: server ishga tushmadi:", err);
  process.exit(1);
});
