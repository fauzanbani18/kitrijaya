const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load .env only if it exists (local development)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  database: process.env.DB_NAME || 'kitrijaya',
  ...(process.env.DB_SOCKET_PATH ? { socketPath: process.env.DB_SOCKET_PATH } : {}),
  // TiDB Cloud serverless tier requires SSL connections
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

let pool;

async function getPool() {
  if (!pool || typeof pool.query !== 'function') {
    try {
      console.log('🔄 Creating database connection pool...');
      console.log('DB_HOST:', process.env.DB_HOST);
      console.log('DB_USER:', process.env.DB_USER);
      console.log('DB_NAME:', process.env.DB_NAME);
      console.log('DB_PORT:', process.env.DB_PORT);
      console.log('DB_PASS:', process.env.DB_PASS ? '***SET***' : 'NOT SET');
      pool = mysql.createPool(poolConfig);

      // Test the connection
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ Database connection pool created successfully');
    } catch (error) {
      console.error('❌ Failed to create database connection pool:', error.message);
      throw error;
    }
  }
  return pool;
}

async function initDB() {
  try {
    // Gunakan getPool() agar tidak ada race condition dengan pool yang sama
    const pool = await getPool();

    // Buat Tabel Admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Inisialisasi admin default jika kosong
    const [admins] = await pool.query('SELECT * FROM admins');
    if (admins.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
    }

    // Buat Tabel Konten Hero
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero (
        id INT PRIMARY KEY DEFAULT 1,
        title VARCHAR(255),
        subtitle TEXT,
        ctaText VARCHAR(255),
        ctaLink VARCHAR(255),
        badge VARCHAR(255),
        image TEXT
      )
    `);
    const [hero] = await pool.query('SELECT * FROM hero');
    if (hero.length === 0) {
      await pool.query(
        'INSERT INTO hero (id, title, subtitle, ctaText, ctaLink, badge, image) VALUES (1, ?, ?, ?, ?, ?, ?)',
        ['Toko Pramuka Kitri Jaya', 'Perlengkapan Pramuka Terlengkap & Berkualitas untuk Semua Tingkatan', 'Lihat Produk Kami', '#products', 'Terpercaya Sejak 2005', '']
      );
    }

    // Buat Tabel Konten About
    await pool.query(`
      CREATE TABLE IF NOT EXISTS about (
        id INT PRIMARY KEY DEFAULT 1,
        title VARCHAR(255),
        description TEXT,
        mission TEXT,
        image TEXT,
        stats JSON
      )
    `);
    const [about] = await pool.query('SELECT * FROM about');
    if (about.length === 0) {
      const defaultStats = JSON.stringify([
        { label: 'Tahun Berpengalaman', value: '18+' },
        { label: 'Produk Tersedia', value: '500+' },
        { label: 'Pelanggan Puas', value: '10K+' },
        { label: 'Kota Terlayani', value: '50+' }
      ]);
      await pool.query(
        'INSERT INTO about (id, title, description, mission, image, stats) VALUES (1, ?, ?, ?, ?, ?)',
        ['Tentang Kitri Jaya', 'Kitri Jaya adalah toko perlengkapan pramuka terpercaya yang telah melayani kebutuhan anggota pramuka di seluruh Indonesia selama lebih dari 18 tahun.', 'Misi kami adalah mendukung kegiatan kepramukaan dengan menyediakan perlengkapan terbaik dan terjangkau.', '', defaultStats]
      );
    }

    // Buat Tabel Kontak
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact (
        id INT PRIMARY KEY DEFAULT 1,
        address TEXT,
        phone VARCHAR(100),
        whatsapp VARCHAR(100),
        email VARCHAR(100),
        mapsEmbed TEXT,
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        tiktok VARCHAR(255),
        openHours VARCHAR(255)
      )
    `);
    const [contact] = await pool.query('SELECT * FROM contact');
    if (contact.length === 0) {
      await pool.query(
        `INSERT INTO contact (id, address, phone, whatsapp, email, mapsEmbed, instagram, facebook, tiktok, openHours)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Jl. Pramuka Raya No. 88, Jakarta Timur, DKI Jakarta 13120', '+62 812-3456-7890', '6281234567890', 'info@kitrijaya.com', 'https://maps.google.com/maps?q=Jakarta&t=&z=13&ie=UTF8&iwloc=&output=embed', 'https://instagram.com/kitrijaya', 'https://facebook.com/kitrijaya', 'https://tiktok.com/@kitrijaya', 'Senin - Sabtu: 08.00 - 17.00 WIB']
      );
    }

    // Buat Tabel Kategori
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    // Buat Tabel Produk
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        short_description VARCHAR(255),
        price INT NOT NULL,
        category VARCHAR(50),
        image TEXT,
        media LONGTEXT,
        badge VARCHAR(100),
        featured BOOLEAN DEFAULT false
      )
    `);
    try { await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(255)'); } catch(e) {}
    try { await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS media LONGTEXT'); } catch(e) {}

    // Buat Tabel Testimoni
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        content TEXT NOT NULL,
        rating INT DEFAULT 5,
        avatar TEXT,
        source VARCHAR(50) DEFAULT 'manual'
      )
    `);

    // Buat Tabel Artikel
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content LONGTEXT,
        image TEXT,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try { await pool.query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS views INT DEFAULT 0'); } catch(e) {}

    // Buat Tabel Buku Saku
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Buat Tabel Lagu Pramuka
    await pool.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255),
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Buat Tabel File Upload (simpan binary di TiDB agar permanen di Vercel)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id VARCHAR(50) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        data LONGBLOB NOT NULL,
        size INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database MySQL Terhubung & Terinisialisasi');
  } catch (error) {
    console.error('❌ Gagal menginisialisasi database MySQL:', error.message);
    console.log('Pastikan MySQL server sedang berjalan dan konfigurasi di .env benar.');
  }
}

module.exports = {
  getPool,
  initDB
};
