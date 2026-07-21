# Dr Ilhom Dental Clinic — Production veb-sayt

Premium stomatologiya klinikasi sayti: React 19 + Vite + Express + SQLite (Node built-in) + jonli operator chat (admin panel orqali).

## Arxitektura

- **Frontend:** React 19, Tailwind CSS 4, motion, i18next (8 til), code-splitting (React.lazy)
- **Backend:** Express — helmet (CSP), compression, rate limiting, JWT (HttpOnly cookie) auth, bcrypt parol hash
- **Baza:** SQLite (`node:sqlite`, WAL) — `data/ilhomdent.db`; kunlik avtomatik backup `backups/` ga
- **Deploy:** Docker + Nginx (HTTPS, gzip, kesh) + Certbot avtoyangilanish

## Lokal ishga tushirish

```bash
npm install
cp .env.example .env      # JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD to'ldiring
npm run dev               # http://localhost:3000
```

Admin panel: saytda **Ctrl + Alt + CapsLock + C** tugmalari bilan ochiladi.
Birinchi marta: `.env` dagi `ADMIN_USERNAME`/`ADMIN_PASSWORD` bilan hisob avtomatik yaratiladi,
yoki env berilmagan bo'lsa panel bir martalik xavfsiz sozlash formasini ko'rsatadi (parol ≥ 8 belgi).

## Production build va tekshirish

```bash
npm run lint     # TypeScript tekshiruvi
npm run build    # dist/ (SPA + server.cjs)
npm start        # NODE_ENV=production node dist/server.cjs
```

## VPS'ga joylash (Docker)

1. Serverga kodni yuklang, `.env` yarating (yuqoridagi kabi, `JWT_SECRET` majburiy).
2. `nginx.conf` va `index.html`, `public/robots.txt`, `public/sitemap.xml` dagi `drilhom.uz` ni o'z domeningizga almashtiring.
3. Birinchi SSL sertifikat:
   ```bash
   docker compose up -d nginx
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d drilhom.uz -d www.drilhom.uz
   ```
4. To'liq ishga tushirish:
   ```bash
   docker compose up -d --build
   ```
5. Tekshirish: `curl https://drilhom.uz/api/health`

Konteynerlar `restart: unless-stopped`; SSL har 12 soatda avtomatik tekshirilib yangilanadi.

## Avtomatika (server ichida o'rnatilgan)

- **Kunlik DB backup** → `backups/` (14 kun saqlanadi)
- **Log fayllar** → `logs/app-YYYY-MM-DD.log` (14 kun, avtotozalash)
- **Chat sessiyalari** avtotozalash (oxirgi 500 tasi saqlanadi)
- **Health check** → `GET /api/health` (Docker healthcheck + UptimeRobot uchun)

Tavsiya: [UptimeRobot](https://uptimerobot.com) da `https://domen/api/health` monitorini yarating (bepul, 5 daqiqada).

## Xavfsizlik xulosasi

- Barcha admin API'lar JWT + rol tekshiruvi bilan himoyalangan
- Parollar bcrypt (12 rounds); ochiq matnda saqlanmaydi
- Rate limiting + brute-force lockout (5 xato → 15 daqiqa)
- CSRF: SameSite=Strict cookie + Origin tekshiruvi
- Upload: faqat rasm (magic-byte tekshiruv), ≤5MB, tasodifiy nom, faqat admin
- Helmet CSP, HSTS (Nginx), secure cookie'lar

## Zaxira nusxa (backup)

Uch xil usulda avtomatik/qo'lda zaxira olinadi (barchasi WAL-xavfsiz `VACUUM INTO` snapshot):

- **Kunlik avtomatik:** `backups/ilhomdent-daily-YYYY-MM-DD.db` (14 kun saqlanadi)
- **O'chishda avtomatik:** `docker compose down`/restart paytida SIGTERM'da so'nggi holat saqlanadi → `ilhomdent-shutdown-*.db`
- **Qo'lda:** `npm run backup` (yoki admin panel autentifikatsiyasi bilan `POST /api/admin/backup`) → `ilhomdent-manual-*.db`, integrity avtomatik tekshiriladi

## Ma'lumotlarni tiklash (restore)

```bash
docker compose stop app
# Eng so'nggi zaxirani tanlang:
ls -t backups/*.db | head
cp backups/<eng-yangi>.db data/ilhomdent.db
docker compose start app
curl https://drilhom.uz/api/health   # status: ok bo'lishi kerak
```

Restore amalda sinovdan o'tkazilgan: 3 yozuv → data/ o'chirildi → backup'dan tiklandi → 3 yozuv qaytdi, health ok.
