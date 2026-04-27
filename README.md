# Kitri Jaya – Website Toko Pramuka 🏕️

Website landing page profesional untuk toko perlengkapan pramuka **Kitri Jaya**, dilengkapi dengan **CMS Admin Panel** untuk mengelola seluruh konten website.

---

## 🚀 Cara Menjalankan (Development)

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
- **Username:** `kitrijayaofc`
- **Password:** `KedaiPramukaKitriJayaPebayuran 181199***`

---

## 🚀 Deployment dengan Git (Production)

Project ini siap di-deploy ke platform cloud menggunakan Git integration.

### 1. Persiapan Database Production

Gunakan database hosting MySQL seperti:
- **PlanetScale** (gratis tier tersedia)
- **Railway** (MySQL support)
- **Aiven** atau **DigitalOcean Managed Database**

Buat database baru dan catat credentials-nya.

### 2. Setup Environment Variables

Copy `backend/.env.example` ke `backend/.env` dan isi dengan data production:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASS=your-production-db-password
DB_NAME=kitrijaya_db
DB_PORT=3306

# JWT Secret (generate random string)
JWT_SECRET=your-secure-random-jwt-secret-here

# Google Places API (opsional)
GOOGLE_PLACES_API_KEY=your-google-api-key
GOOGLE_PLACE_ID=your-place-id
```

### 3. Deploy ke Vercel

1. **Connect Repository**: Hubungkan repository GitHub ke Vercel
2. **Environment Variables**: Set semua env vars di Vercel dashboard
3. **Deploy**: Vercel akan otomatis deploy saat ada push ke branch `main`

### 4. Import Database Schema

Setelah deploy, jalankan SQL schema dari `backend/xampp-setup.sql` ke database production Anda.

---

## 📁 Struktur Project

```
kitrijaya/
├── frontend/          # Static files (HTML, CSS, JS)
├── backend/           # Node.js API server
│   ├── server.js      # Main server file
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   ├── config/        # Database config
│   └── data/          # JSON data files
├── admin/             # Admin CMS panel
└── package.json       # Root package.json
```

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Deployment**: Vercel (recommended)

---

## 📝 Catatan

- Pastikan repository GitHub Anda **public** agar bisa diakses Vercel
- Untuk production, gunakan database hosting yang reliable
- Backup database secara berkala
- Monitor logs di Vercel dashboard untuk troubleshooting

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
