#!/usr/bin/env bash
# Build MacFyi tanpa Swift Package Manager (mengatasi PackageDescription error)
set -euo pipefail

APP_NAME="MacFyi"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/Sources/MacFyiApp"
RELEASE_DIR="${SCRIPT_DIR}/.build/release"
BIN="${RELEASE_DIR}/${APP_NAME}"

echo "[i] Direktori: ${SCRIPT_DIR}"
echo "[i] Mengkompilasi dengan swiftc (tanpa SPM)..."

mkdir -p "${RELEASE_DIR}"

swiftc \
  -target x86_64-apple-macos12.0 \
  -framework AppKit \
  -framework SwiftUI \
  -framework UserNotifications \
  -o "${BIN}" \
  $(find "${SRC_DIR}" -name "*.swift")

if [[ ! -x "${BIN}" ]]; then
  echo "[!] Gagal kompilasi"
  exit 1
fi
echo "[✓] Binary siap: ${BIN}"

# Rakit .app bundle
STAGING="$(mktemp -d)"
APP_BUNDLE="${STAGING}/${APP_NAME}.app"
CONTENTS="${APP_BUNDLE}/Contents"
MACOS_DIR="${CONTENTS}/MacOS"
mkdir -p "${MACOS_DIR}"

cp "${BIN}" "${MACOS_DIR}/${APP_NAME}"
chmod +x "${MACOS_DIR}/${APP_NAME}"
cp "${SCRIPT_DIR}/Info.plist" "${CONTENTS}/Info.plist"
xattr -cr "${APP_BUNDLE}" 2>/dev/null || true

echo "[✓] App bundle dikemas"

# Install ke /Applications
INSTALL_APP="/Applications/${APP_NAME}.app"
if [[ -e "${INSTALL_APP}" ]]; then
  if [[ -w /Applications ]]; then rm -rf "${INSTALL_APP}"; else sudo rm -rf "${INSTALL_APP}"; fi
fi

if [[ -w /Applications ]]; then
  cp -R "${APP_BUNDLE}" "/Applications/"
else
  echo "[i] Membutuhkan akses admin untuk menyalin ke /Applications..."
  sudo cp -R "${APP_BUNDLE}" "/Applications/"
fi
rm -rf "${STAGING}"

echo "[✓] Terinstal di: ${INSTALL_APP}"
echo "[i] Meluncurkan..."
open -a "${APP_NAME}" || "${INSTALL_APP}/Contents/MacOS/${APP_NAME}" &
echo "Selesai. Ikon MacFyi ada di menu bar."
