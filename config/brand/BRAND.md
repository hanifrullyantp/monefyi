# froyek: Brand Kit (untuk AI & developer)

Nama: **froyek** (selalu huruf kecil semua). Tagline: **Agent for your project**.
Logo = mark lipatan kertas (origami "F") + wordmark Montserrat Bold. Semua file di folder ini siap pakai; jangan menggambar ulang logo.

## 1. Warna
| Token | Hex | Pakai untuk |
|---|---|---|
| forest | `#0A3A2E` | warna utama, latar gelap, logo di latar terang, theme-color |
| white | `#FFFFFF` | logo di latar gelap, teks di atas forest |
| fold | white @ 30% (di atas forest) / forest @ 30% (di atas putih) | lipatan di dalam mark (sudah ada di SVG) |

Brand hanya dua warna. Turunan (tint forest untuk UI, mis. `#3B6158` / `#E7EEEC`) boleh dibuat, tapi itu bukan bagian dari logo.

## 2. Tipografi
Wordmark & tagline: **Montserrat** (Bold 700 untuk nama, Medium 500 + letter-spacing ±0.07em huruf kapital untuk tagline). Di file SVG wordmark sudah berupa outline, tidak butuh font. Untuk heading UI pakai Montserrat 600/700; body boleh Inter atau system-ui.

## 3. Pilih file yang tepat
| Kebutuhan | File |
|---|---|
| Latar **gelap** (forest/hitam/foto gelap) | `svg/*-white.svg` |
| Latar **terang** | `svg/*-forest.svg` |
| Header/navbar web | `svg/froyek-horizontal-{white\|forest}.svg` |
| Cover, slide judul, splash | `svg/froyek-stacked-on-forest.svg` (sudah ber-latar) atau `froyek-stacked-*` |
| Hanya simbol (watermark, kecil, avatar) | `svg/froyek-mark-*.svg` |
| App icon / tile persegi | `svg/froyek-icon-rounded.svg` (rounded) · `froyek-icon-square.svg` (full-bleed) |
| Favicon & PWA | folder `favicon/` + `favicon/head-snippet.html` |
| Link preview (OG/Twitter) | `social/og-image.png` (1200x630) |
| Foto profil sosmed | `social/avatar-1024x1024.png` |
| Dokumen/PPT/email (raster) | `png/` (transparan, 1024-2400 px) |

Utamakan **SVG**; pakai PNG hanya bila platform tidak mendukung SVG.

## 4. Aturan pakai
- Clear space minimum: 25% lebar mark di semua sisi.
- Ukuran minimum: mark 16 px, horizontal 96 px lebar, stacked dengan tagline 160 px lebar (di bawah itu pakai `*-notagline` atau mark saja).
- Mark di latar apa pun hanya forest atau putih, kontras tinggi.
- **Jangan**: mengubah warna selain dua di atas, memiringkan/meregangkan, menambah bayangan/outline/gradient, memutar mark, mengganti font wordmark, menulis "Froyek"/"FROYEK", menaruh logo di latar foto ramai tanpa overlay, menggeser/memisahkan potongan mark.

## 5. Snippet
Favicon (salin isi `favicon/` ke root situs):
```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0A3A2E">
```
CSS variables:
```css
:root{ --froyek-forest:#0A3A2E; --froyek-white:#FFFFFF; }
```
Tailwind:
```js
colors:{ froyek:{ forest:'#0A3A2E', white:'#FFFFFF' } }
```
Inline mark (SVG, `fg` ganti `#FFFFFF` atau `#0A3A2E`):
```html
<svg viewBox="0 0 757 897" role="img" aria-label="froyek"><polygon fill="#FFF" fill-opacity=".3" points="254.5,531 306,600.5 0,685"/><polygon fill="#FFF" points="0,440 757,0 589,338 0,685"/><polygon fill="#FFF" points="0,685 307,599 307,897"/></svg>
```

## 6. Catatan asal-usul
Mark divektorkan dari artwork asli (kecocokan ±99%). Wordmark dibangun ulang dengan Montserrat Bold sebagai outline (mendekati artwork asli, bukan salinan piksel). Jika ada file vektor master dari desainer, gantikan isi `svg/` dengan itu dan pertahankan nama file.
