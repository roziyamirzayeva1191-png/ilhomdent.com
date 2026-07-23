#!/bin/sh
# ============================================================
# Deploy Watcher — VPS (host) tomonida ishlaydi, KONTEYNER ICHIDA EMAS.
#
# Bu skript ilova konteyneriga HECH QANDAY Docker huquqi bermaydi.
# U shunchaki har daqiqada bitta oddiy fayl borligini tekshiradi:
#   ./deploy-signal/update.request
# Agar fayl mavjud bo'lsa (admin panelda "Yangilash" tugmasi bosilgan
# bo'lsa), FAQAT shu qat'iy, o'zgarmas buyruqni bajaradi:
#   git pull && docker compose up -d --build
# Boshqa hech qanday buyruq qabul qilinmaydi va bajarilmaydi — bu
# ilova ichidan kiritilgan har qanday ma'lumotdan mustaqil.
#
# O'RNATISH (VPS'da, bir marta):
#   1) Ushbu faylni ijro etiladigan qiling:
#        chmod +x scripts/deploy-watcher.sh
#   2) Cron orqali har daqiqada ishga tushiring (crontab -e):
#        * * * * * /bin/sh /opt/ilhomdent/scripts/deploy-watcher.sh >> /opt/ilhomdent/deploy-signal/watcher.log 2>&1
#      (yo'lni o'zingizning loyiha joylashuviga moslang)
#
# Xavfsizlik eslatmasi: bu skript faqat SHU loyiha papkasida, SHU
# ikkita qat'iy buyruqni bajaradi. Ilova (Node/Express) konteyneri bu
# skriptni ishga tushira olmaydi, faqat signal-faylni yoza oladi.
# ============================================================

set -e

# Ushbu skript joylashgan loyihaning ILDIZ papkasiga o'tamiz
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

REQUEST_FILE="./deploy-signal/update.request"
LOG_FILE="./deploy-signal/update.log"

if [ ! -f "$REQUEST_FILE" ]; then
  exit 0
fi

{
  echo "============================================================"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yangilanish so'rovi topildi. Boshlanmoqda..."
  cat "$REQUEST_FILE"
  echo "------------------------------------------------------------"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] git pull ishga tushmoqda..."
  git pull origin main

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] docker compose up -d --build ishga tushmoqda..."
  docker compose up -d --build

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yangilanish muvaffaqiyatli yakunlandi."
  echo "============================================================"
} >> "$LOG_FILE" 2>&1

# Log faylni cheklab turish (oxirgi ~500 qator saqlanadi)
tail -n 500 "$LOG_FILE" > "$LOG_FILE.tmp" 2>/dev/null && mv "$LOG_FILE.tmp" "$LOG_FILE" || true

rm -f "$REQUEST_FILE"
