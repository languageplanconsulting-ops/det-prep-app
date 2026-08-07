#!/bin/bash
# เรนเดอร์ public/rmd-az-light-gel-analysis.html เป็น PNG สี่เหลี่ยมจัตุรัสพร้อมลง Instagram
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="${1:-rmd-az-light-gel-analysis.html}"
case "$HTML" in
  /*) ;;                                   # already absolute
  *)  HTML="$ROOT/public/$(basename "$HTML")" ;;
esac
[ -f "$HTML" ] || { echo "ไม่พบไฟล์: $HTML" >&2; exit 1; }
OUT="${2:-$HOME/Downloads/$(basename "${HTML%.html}").png}"

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1080,1080 \
  --virtual-time-budget=4000 \
  --screenshot="$OUT" \
  "file://$HTML" 2>/dev/null

echo "เรนเดอร์เสร็จ → $OUT  (2160x2160)"
open -R "$OUT"
