# 🚀 Cara Start Project Orchestra

Panduan menjalankan aplikasi dari nol. Setiap command diberi keterangan **apa fungsinya**.

> **Arsitektur singkat:** ada 3 bagian yang harus hidup berbarengan —
> **(1) Database PostgreSQL**, **(2) Backend NestJS** di port `3000`, **(3) Frontend Next.js** di port `3001`.
> Urutannya penting: DB → Backend → Frontend.

---

## 0. Prasyarat (cukup sekali cek)

| Yang dibutuhkan | Kenapa |
| --- | --- |
| **Node.js** (v20+) | Runtime backend & frontend. Cek: `node -v` |
| **PostgreSQL** jalan di `localhost:5432` | Database utama. DB bernama `orchestra`. |
| File `backend/.env` terisi | Menyimpan kredensial: `DATABASE_URL`, `NOTION_API_KEY`, `GROQ_API_KEY`, `ZOOM_*`, `GITHUB_WEBHOOK_URL`. Tanpa ini backend gagal connect. |

---

## 1. Setup pertama kali (sekali saja per mesin / setelah `git clone`)

```powershell
# Masuk ke folder backend, lalu install semua dependency backend
cd backend
npm install

# Generate Prisma Client (kode TypeScript untuk akses DB) dari schema.prisma
npx prisma generate

# Terapkan semua migration ke database (membuat tabel-tabelnya)
npx prisma migrate deploy

# Pindah ke frontend, install dependency frontend
cd ../frontend
npm install
```

**Keterangan tiap command:**
- `npm install` → mengunduh semua package di `package.json` ke `node_modules`. Wajib sebelum command lain bisa jalan.
- `npx prisma generate` → membaca `prisma/schema.prisma` lalu membuat Prisma Client (objek `prisma.user`, `prisma.notionTask`, dll). Tanpa ini, backend tidak tahu cara query DB.
- `npx prisma migrate deploy` → menjalankan semua file migration yang ada (di `prisma/migrations/`) supaya struktur tabel DB sesuai schema. Aman dijalankan berulang.

---

## 2. Menjalankan harian (setiap mau ngoding / demo)

Buka **2 terminal terpisah**.

### Terminal 1 — Backend (port 3000)

```powershell
cd backend
npm run start:dev
```

- `npm run start:dev` → menjalankan `nest start --watch`. Backend hidup di **http://localhost:3000** dan **auto-restart** setiap kali file `.ts` diubah.
- ✅ Tanda sukses: muncul log `Nest application successfully started` dan daftar route ter-`Mapped`.
- ⚠️ **Tunggu backend benar-benar siap dulu** sebelum start frontend, supaya backend yang dapat port 3000 (frontend ngambil API dari `localhost:3000`).

### Terminal 2 — Frontend (port 3001)

```powershell
cd frontend
npm run dev -- -p 3001
```

- `npm run dev` → menjalankan `next dev` (mode development, ada hot-reload).
- `-- -p 3001` → memaksa frontend di port **3001** (karena port 3000 sudah dipakai backend).
- ✅ Tanda sukses: muncul `Ready in ...` dan `Local: http://localhost:3001`.
- 🌐 Buka **http://localhost:3001** di browser.

> **Kenapa port-nya begini?**
> `frontend/app/lib/api.ts` default memanggil API ke `http://localhost:3000`. Jadi **backend wajib di 3000**, dan frontend "mengalah" ke 3001. CORS di `backend/src/main.ts` sudah mengizinkan `localhost:3001`.

---

## 3. Kalau mengubah schema database (`schema.prisma`)

Setiap kali menambah/mengubah model di `backend/prisma/schema.prisma`:

```powershell
cd backend

# Buat file migration baru + terapkan ke DB + regenerate Prisma Client sekaligus
npx prisma migrate dev --name nama_perubahan_singkat
```

- `npx prisma migrate dev --name ...` → (1) membandingkan schema dengan DB, (2) membuat file SQL migration baru, (3) menjalankannya ke DB, (4) regenerate Prisma Client. Sekali jalan, semua beres.
- Ganti `nama_perubahan_singkat` dengan deskripsi, mis. `add_notion_tasks`.

### ⚠️ Kalau muncul error `EPERM ... query_engine-windows.dll.node`
Artinya backend yang sedang jalan **mengunci** file Prisma. Solusinya: matikan backend dulu.

```powershell
# Matikan semua proses node (backend + frontend)
Get-Process node | Stop-Process -Force

# Jalankan ulang generate / migrate
npx prisma generate
```

Lalu start lagi backend & frontend seperti Bagian 2.

---

## 4. Tools bantu (opsional)

```powershell
# Lihat & edit isi database lewat GUI di browser (http://localhost:5555)
cd backend
npx prisma studio
```

- `npx prisma studio` → membuka editor visual untuk tabel DB. Berguna buat cek data (mis. isi tabel `NotionTask`) tanpa nulis SQL.

---

## 5. Menghentikan aplikasi

- Di tiap terminal: tekan **`Ctrl + C`**.
- Atau paksa matikan semua sekaligus:

```powershell
Get-Process node | Stop-Process -Force
```

---

## 6. Troubleshooting cepat

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `Error: listen EADDRINUSE :::3000` | Port 3000 sudah dipakai (backend lain belum mati, atau frontend kebagian 3000 duluan) | `Get-Process node \| Stop-Process -Force`, lalu start **backend dulu**, baru frontend. |
| Frontend jalan tapi semua data gagal / error fetch | Backend belum hidup di 3000 | Pastikan Terminal 1 sudah `Nest application successfully started`. |
| `EPERM ... query_engine-windows.dll.node` | Prisma client dikunci backend yang sedang jalan | Matikan node dulu (lihat Bagian 3). |
| `Can't reach database server at localhost:5432` | PostgreSQL belum jalan | Nyalakan service/container PostgreSQL-mu. |
| Perubahan model tidak terbaca (`Property 'x' does not exist on PrismaService`) | Prisma Client belum di-regenerate | `npx prisma generate` (matikan backend dulu kalau EPERM). |

---

## Ringkasan super singkat (TL;DR)

```powershell
# Terminal 1
cd backend; npm run start:dev          # backend → http://localhost:3000

# Terminal 2 (setelah backend siap)
cd frontend; npm run dev -- -p 3001    # frontend → http://localhost:3001
```

Buka **http://localhost:3001**. Selesai. 🎉
