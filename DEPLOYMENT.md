# 🚀 VPS Deployment Runbook — Dr Ilhom Dental Clinic

Ushbu qo'llanma loyihani noldan ishlab chiqarish (production) serveriga joylashtirish uchun.
Har bir bosqichda tekshirish buyrug'i berilgan. Bosqichlarni tartib bilan bajaring.

> **Eslatma:** Kod tomonidagi barcha tekshiruvlar (build, lint, `npm audit` = 0 zaiflik, backup/restore sinovi, chat oqimi, auth) mahalliy muhitda muvaffaqiyatli o'tkazilgan. Quyidagi bosqichlar sizning VPS'ingiz, domeningiz va tashqi xizmatlaringizni talab qiladi.

---

## 0. Talablar

- Ubuntu 22.04+ VPS (kamida 1 GB RAM), root yoki sudo huquqi
- Domen (masalan `drilhom.uz`) — DNS `A` yozuvi VPS IP'siga yo'naltirilgan
- Docker + Docker Compose o'rnatilgan:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo apt-get install -y docker-compose-plugin
  ```

## 1. Domenni ulash (DNS)

Domen provayderingizda:
```
A     @      <VPS_IP>
A     www    <VPS_IP>
```
Tekshirish (30 daqiqagacha tarqalishi mumkin):
```bash
dig +short drilhom.uz     # VPS IP chiqishi kerak
```

## 2. Kodni serverga yuklash va sozlash

```bash
git clone <repo> ilhomdent && cd ilhomdent   # yoki fayllarni scp bilan yuklang

# .env yarating
cp .env.example .env
nano .env
```
`.env` ni to'ldiring:
```
JWT_SECRET=<64 belgi>          # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
ADMIN_USERNAME=<login>
ADMIN_PASSWORD=<kuchli parol, ≥8 belgi>
APP_URL=https://drilhom.uz
```

**Domenni almashtiring** (`drilhom.uz` → o'zingizniki) quyidagi 4 faylda:
`nginx.conf`, `index.html`, `public/robots.txt`, `public/sitemap.xml`
```bash
grep -rl "drilhom.uz" nginx.conf index.html public/ | xargs sed -i 's/drilhom\.uz/SIZNING-DOMEN.uz/g'
```

## 3. SSL sertifikat (Let's Encrypt / Certbot)

```bash
# Avval faqat Nginx'ni ko'taring (ACME challenge uchun)
docker compose up -d nginx

# Sertifikat oling (email va domenni almashtiring)
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d drilhom.uz -d www.drilhom.uz --email siz@example.com --agree-tos --no-eff-email
```
Tekshirish:
```bash
ls certbot/conf/live/drilhom.uz/    # fullchain.pem, privkey.pem bo'lishi kerak
```

## 4. To'liq ishga tushirish

```bash
docker compose up -d --build
docker compose ps        # app, nginx, certbot — barchasi "Up (healthy)" bo'lishi kerak
```
Tekshirish:
```bash
curl -I https://drilhom.uz                 # HTTP/2 200
curl https://drilhom.uz/api/health         # {"status":"ok","db":"ok",...}
curl -I http://drilhom.uz                  # 301 -> https (redirect)
```

## 5. SSL sifatini tasdiqlash

- Brauzerda `https://drilhom.uz` — qulf belgisi, sertifikat amal qiladi
- Onlayn: https://www.ssllabs.com/ssltest/ — **A** yoki **A+** kutiladi (config'da TLS 1.2/1.3, HSTS bor)
- SSL avtoyangilanishi: `certbot` konteyneri har 12 soatda tekshiradi (docker-compose'da sozlangan) — qo'shimcha ish shart emas

## 6. Lighthouse hisoboti

Mahalliy kompyuterda (Chrome bilan):
```bash
npx lighthouse https://drilhom.uz --view --preset=desktop
npx lighthouse https://drilhom.uz --view                 # mobil
```
Kutilgan natijalar (kod shunga optimallashtirilgan): Performance 90+, Accessibility 90+, Best Practices 100, SEO 100.
Yoki brauzerda: DevTools (F12) → Lighthouse → Analyze page load.

## 7. Xavfsizlik skaneri

```bash
# Bog'liqliklar (mahalliy yoki serverda)
npm audit                 # kutilgan: found 0 vulnerabilities

# OWASP ZAP (Docker bilan, tashqaridan skaner)
docker run --rm -t ghcr.io/zaproxy/zaproxy zap-baseline.py -t https://drilhom.uz
```
ZAP baseline'da kutilgan: kritik/yuqori topilma yo'q. `X-Frame-Options`, `CSP`, `HSTS`, `nosniff` header'lar allaqachon o'rnatilgan (helmet + nginx).

## 8. Monitoring (UptimeRobot)

1. https://uptimerobot.com da bepul hisob oching
2. **+ Add New Monitor** → Monitor Type: **HTTP(s)**
3. URL: `https://drilhom.uz/api/health`
4. Monitoring Interval: 5 daqiqa
5. **Advanced → Keyword Monitoring** (ixtiyoriy): keyword `"status":"ok"` — bazasi yiqilsa ham (503) ogohlantirsin
6. Alert Contacts: emailingizni qo'shing

Endpoint 200 + `{"status":"ok"}` qaytaradi; DB muammosida 503 + `"degraded"`.

## 9. Backup va tiklash sinovi

```bash
# Qo'lda zaxira olish
docker compose exec app node scripts/backup.mjs
# yoki admin login bilan: POST /api/admin/backup

# Zaxiralar ro'yxati (host'da ko'rinadi — volume orqali)
ls -t backups/*.db | head

# TIKLASH sinovi (test ma'lumot bilan bir marta sinang):
docker compose stop app
cp backups/<eng-yangi>.db data/ilhomdent.db
docker compose start app
curl https://drilhom.uz/api/health     # status: ok
```
Kunlik zaxira + o'chishda zaxira avtomatik ishlaydi (README'ga qarang). 14 kundan eski zaxiralar avtotozalanadi.

## 10. Yakuniy tekshiruv ro'yxati (deploy'dan keyin)

- [ ] `https://domen` ochiladi, qulf belgisi bor
- [ ] `http://domen` → `https` ga yo'naltiriladi
- [ ] `/api/health` → `{"status":"ok"}`
- [ ] Qabulga yozilish formasi ishlaydi (test ariza yuboring, admin panelda ko'ring)
- [ ] Chat: xabar yozing → admin panelga tushadi → ovoz chiqadi → javob qaytadi
- [ ] Admin panel: Ctrl+Alt+CapsLock+C, login, CRUD, qidiruv/filter/pagination
- [ ] Lighthouse: 4 ta ko'rsatkich maqsadga yaqin
- [ ] `npm audit`: 0 zaiflik
- [ ] UptimeRobot monitori "Up"
- [ ] Backup'dan tiklash bir marta sinovdan o'tdi
- [ ] `.env` va `data/`, `backups/` git'ga tushmagan (`.gitignore`da bor)

Barcha bandlar bajarilsa — loyiha **production'ga to'liq tayyor**.

## Foydali buyruqlar

```bash
docker compose logs -f app          # jonli loglar
docker compose logs -f nginx
docker compose restart app          # qayta ishga tushirish (o'chishda avtozaxira olinadi)
docker compose down                 # to'xtatish (ma'lumot data/ da saqlanadi)
docker compose up -d --build        # yangilangan koddan qayta build
```
