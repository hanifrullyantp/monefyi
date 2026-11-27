#!/usr/bin/env bash
#
# One-click install script for MacFyi — macOS menu bar (status bar) app.
# Builds in release mode, assembles a proper .app bundle, installs to /Applications,
# and launches the app. Requires Xcode Command Line Tools (Swift 5.9+).
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
#
set -euo pipefail

APP_NAME="MacFyi"
BUNDLE_NAME="${APP_NAME}.app"
INSTALL_APP="/Applications/${BUNDLE_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
RELEASE_BIN="${PROJECT_DIR}/.build/release/${APP_NAME}"

echo "=============================================="
echo "  MacFyi — One-Click Installer (macOS)"
echo "=============================================="
echo "Project: ${PROJECT_DIR}"

# ---------------------------------------------------------------------------
# 1. Toolchain check
# ---------------------------------------------------------------------------
if ! command -v swift >/dev/null 2>&1; then
  echo "[!] Swift toolchain tidak ditemukan."
  echo "    Instal Xcode Command Line Tools terlebih dahulu:"
  echo "      xcode-select --install"
  exit 1
fi

SWIFT_VER=$(swift --version 2>/dev/null | head -n 1 | grep -oE '[0-9]+\.[0-9]+' | head -n 1 || true)
echo "[i] Swift terdeteksi: ${SWIFT_VER:-unknown}"

if [[ -n "${SWIFT_VER}" ]]; then
  MAJOR=$(echo "${SWIFT_VER}" | cut -d. -f1)
  MINOR=$(echo "${SWIFT_VER}" | cut -d. -f2)
  if [[ "${MAJOR}" -lt 5 ]] || { [[ "${MAJOR}" -eq 5 ]] && [[ "${MINOR}" -lt 7 ]]; }; then
    echo "[!] Peringatan: MacFyi memerlukan Swift 5.7+ (macOS 12 API)."
    echo "    Swift ${SWIFT_VER} terdeteksi. Build mungkin gagal."
    echo "    Perbarui Xcode atau pasang toolchain Swift 5.7+."
    echo ""
  fi
fi

# ---------------------------------------------------------------------------
# 2. Build release
# ---------------------------------------------------------------------------
cd "${PROJECT_DIR}"

echo "[i] Membangun dalam mode release (swift build -c release)..."
swift build -c release

if [[ ! -x "${RELEASE_BIN}" ]]; then
  echo "[!] Gagal: binary release tidak ditemukan di ${RELEASE_BIN}"
  exit 1
fi
echo "[✓] Binary siap: ${RELEASE_BIN}"

# ---------------------------------------------------------------------------
# 3. Assemble .app bundle (staging)
# ---------------------------------------------------------------------------
STAGING_ROOT="$(mktemp -d)"
STAGING_APP="${STAGING_ROOT}/${BUNDLE_NAME}"
CONTENTS="${STAGING_APP}/Contents"
MACOS_DIR="${CONTENTS}/MacOS"
RESOURCES_DIR="${CONTENTS}/Resources"

mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}"

# Binary
cp "${RELEASE_BIN}" "${MACOS_DIR}/${APP_NAME}"
chmod +x "${MACOS_DIR}/${APP_NAME}"

# Info.plist (LSUIElement = true -> hanya menu bar, tidak ada ikon Dock)
cp "${PROJECT_DIR}/Info.plist" "${CONTENTS}/Info.plist"

# Hilangkan quarantine agar Gatekeeper tidak memblokir peluncuran (best effort)
xattr -cr "${STAGING_APP}" 2>/dev/null || true

echo "[✓] App bundle dikemas (staging)"

# ---------------------------------------------------------------------------
# 4. Install ke /Applications
# ---------------------------------------------------------------------------
if [[ -e "${INSTALL_APP}" ]]; then
  if [[ -w /Applications ]]; then
    rm -rf "${INSTALL_APP}"
  else
    sudo rm -rf "${INSTALL_APP}"
  fi
fi

if [[ -w /Applications ]]; then
  cp -R "${STAGING_APP}" "/Applications/"
else
  echo "[i] Membutuhkan akses admin untuk menyalin ke /Applications..."
  sudo cp -R "${STAGING_APP}" "/Applications/"
fi

rm -rf "${STAGING_ROOT}"
echo "[✓] Terinstal di: ${INSTALL_APP}"

# ---------------------------------------------------------------------------
# 5. Jalankan aplikasi
# ---------------------------------------------------------------------------
echo "[i] Meluncurkan MacFyi..."
open -a "${APP_NAME}" 2>/dev/null || {
  # Fallback: jalankan binary secara langsung
  "${INSTALL_APP}/Contents/MacOS/${APP_NAME}" &
}

echo ""
echo "=============================================="
echo "  Selesai! MacFyi siap digunakan."
echo "=============================================="
echo "Ikuti ikon MacFyi di sebelah kanan menu bar."
echo "Klik ikon untuk membuka popover monitoring."
echo ""
echo "Catatan Gatekeeper:"
echo "  Jika macOS mencegah peluncuran, buka:"
echo "  Sistem Pengaturan > Privasi & Keamanan > Keamanan"
echo "  lalu klik \"Buka sekali\" pada MacFyi."
echo ""
