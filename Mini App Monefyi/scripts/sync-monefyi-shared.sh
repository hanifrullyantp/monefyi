#!/usr/bin/env bash
# Salin modul shared Monefyi ke semua mini app
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/_shared"

APPS=(
  "Bagi Hasil"
  "budget-planner"
  "debt-free-planner"
  "Kalkulator Gaji"
  "Hitung Gaji"
  "Hitung Zakat"
  "Hitung Waris"
)

for app in "${APPS[@]}"; do
  DEST="$ROOT/$app"
  [ -d "$DEST/src" ] || continue
  mkdir -p "$DEST/src/lib" "$DEST/src/components/monefyi" "$DEST/src/components/shared"
  cp "$SHARED/monefyi-config.ts" "$DEST/src/lib/"
  cp "$SHARED/supabase-client.ts" "$DEST/src/lib/"
  cp "$SHARED/monefyi-auth.ts" "$DEST/src/lib/"
  cp "$SHARED/MonefyiAppLayout.tsx" "$DEST/src/components/monefyi/"
  cp "$SHARED/bonus-config.ts" "$DEST/src/lib/"
  cp "$SHARED/MonefyiAuthProvider.tsx" "$DEST/src/components/monefyi/"
  cp "$SHARED/MonefyiLoginGate.tsx" "$DEST/src/components/monefyi/"
  cp "$SHARED/MonefyiBrandBar.tsx" "$DEST/src/components/monefyi/"
  cp "$SHARED/MonefyiProviders.tsx" "$DEST/src/components/monefyi/"
  cp "$SHARED/BonusLiteBanner.tsx" "$DEST/src/components/shared/" 2>/dev/null || true
  cp "$SHARED/LifetimeBonusCTA.tsx" "$DEST/src/components/shared/" 2>/dev/null || true
  # Fix imports in shared components
  for f in "$DEST/src/components/shared/"*.tsx; do
    [ -f "$f" ] && sed -i '' "s|from './bonus-config'|from '@/lib/bonus-config'|g" "$f" 2>/dev/null || true
  done
  echo "Synced: $app"
done
