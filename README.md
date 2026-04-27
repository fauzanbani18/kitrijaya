# Kitri Jaya – Website Toko Pramuka 🏕️

Website landing page profesional untuk toko perlengkapan pramuka **Kitri Jaya**, dilengkapi dengan **CMS Admin Panel** untuk mengelola seluruh konten website.

---

## 🚀 Cara Menjalankan

```bash
# 1. Masuk ke folder backend & install dependencies (hanya sekali)
cd backend
npm install

# 2. Jalankan server
node server.js
```

Server akan berjalan di **http://localhost:3000**

### 🔧 Setup Database XAMPP
1. Buka XAMPP Control Panel.
2. Jalankan MySQL.
3. Buka phpMyAdmin di **http://localhost/phpmyadmin**.
4. Pilih tab **SQL**, lalu impor file `backend/xampp-setup.sql`.
5. Atau jalankan skrip SQL secara langsung ke database baru `kitrijaya_db`.
6. Pastikan file `backend/.env` diisi:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=kitrijaya_db
```

> Jika XAMPP menggunakan socket MySQL khusus, gunakan `DB_SOCKET_PATH` di `backend/.env`.

---

## 🌐 Akses

| Halaman | URL |
|---------|-----|
| **Landing Page** | http://localhost:3000 |
| **Admin CMS** | http://localhost:3000/admin |

### Login Admin
- **Username:** `admin`
- **Password:** `admin123`

---

## 🗂️ Struktur Project

```
kitrijaya/
├── backend/
│   ├── server.js          # Entry point Express
│   ├── routes/
│   │   ├── auth.js        # Login & JWT
│   │   ├── content.js     # CRUD semua konten
│   │   └── upload.js      # Upload gambar
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   ├── data/
│   │   └── db.json        # Database JSON (auto-generated)
│   └── uploads/           # Folder gambar upload
├── frontend/              # Landing Page
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
└── admin/                 # Panel CMS Admin
    ├── index.html         # Halaman login
    ├── dashboard.html     # Dashboard utama
    ├── css/admin.css
    └── js/admin.js
```

---

## ✨ Fitur

### Landing Page
- ✅ Hero section dinamis (dari CMS)
- ✅ Tentang toko
- ✅ Grid produk dengan filter kategori
- ✅ Slider testimoni pelanggan
- ✅ Peta & info kontak
- ✅ Tombol WhatsApp floating
- ✅ Responsive mobile-friendly
- ✅ Animasi scroll

### Admin CMS
- ✅ Login aman dengan JWT
- ✅ Dashboard statistik
- ✅ Kelola Hero Section
- ✅ Kelola info Tentang Toko
- ✅ CRUD Kategori Produk
- ✅ CRUD Produk (dengan upload foto)
- ✅ CRUD Testimoni
- ✅ Kelola Info Kontak & Social Media
- ✅ Upload gambar

---

## 🔒 Ganti Password Admin

Masuk ke Admin CMS → gunakan endpoint:
```
POST /api/auth/change-password
Authorization: Bearer <token>
Body: { "newPassword": "passwordbaru" }
```
# kitrijaya
# kitrijaya
# kitrijaya
