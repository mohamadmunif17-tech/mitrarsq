# Monitoring Tahfidz — SMK Telkom Malang (Prototipe Web)

Proyek React + Vite. Data contoh sudah disertakan (siswa, kelompok, presensi, nilai) dan tersimpan di **localStorage browser** — artinya data tersimpan per perangkat/browser, bukan dibagikan otomatis ke pengguna lain. Untuk data yang benar-benar dipakai bersama banyak pengguna dari perangkat berbeda, sistem ini nantinya perlu backend/database sungguhan (lihat Bab 3 Blueprint Final).

## Login demo
Buka aplikasi → pilih peran (Admin / Pengajar / Mentor / Siswa) → klik salah satu akun contoh.

---

## Opsi A — Deploy ke Vercel (disarankan, via Git)

1. Buat repository baru di GitHub, lalu upload semua isi folder ini (kecuali `node_modules` dan `dist`, sudah diabaikan lewat `.gitignore`).
   ```bash
   git init
   git add .
   git commit -m "Prototipe Monitoring Tahfidz"
   git branch -M main
   git remote add origin <URL_REPO_GITHUB_KAMU>
   git push -u origin main
   ```
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repository tadi.
3. Vercel otomatis mendeteksi framework **Vite**. Biarkan pengaturan default:
   - Build Command: `npm run build` (otomatis terisi)
   - Output Directory: `dist` (otomatis terisi)
4. Klik **Deploy**. Tunggu 1–2 menit, dan aplikasi akan mendapat URL langsung (mis. `nama-proyek.vercel.app`).
5. Setiap kali kamu push perubahan ke GitHub, Vercel otomatis build ulang dan update situsnya.

## Opsi B — Deploy ke Netlify

### B1. Cara tercepat (drag & drop, tanpa Git)
1. Buka file terpisah **`tahfidz-dist-siap-pakai.zip`** yang juga saya berikan — ekstrak dulu di komputer kamu.
2. Buka [app.netlify.com/drop](https://app.netlify.com/drop).
3. Seret (drag) folder hasil ekstrak tadi ke halaman tersebut.
4. Netlify langsung memberi URL live dalam hitungan detik.
   > Catatan: karena cara ini tidak terhubung ke kode sumber, untuk update berikutnya kamu perlu build ulang (`npm run build`) dan drag-drop folder `dist` yang baru.

### B2. Cara terhubung Git (disarankan untuk update jangka panjang)
1. Push kode ini ke GitHub (lihat langkah git di Opsi A).
2. Di Netlify: **Add new site → Import an existing project** → pilih repo GitHub kamu.
3. Setting build:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Klik **Deploy site**.

---

## Menjalankan di komputer sendiri (opsional, sebelum deploy)
```bash
npm install
npm run dev
```
Lalu buka `http://localhost:5173`.

## Build manual (jika ingin generate ulang folder dist)
```bash
npm install
npm run build
```
Hasilnya ada di folder `dist/`.
