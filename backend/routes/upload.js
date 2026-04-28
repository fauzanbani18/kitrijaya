const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');
const router = express.Router();

// Pastikan tabel ada sebelum dipakai (self-healing untuk cold-start Vercel)
async function ensureMediaTable() {
  const pool = await getPool();
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
  return pool;
}

// Pakai memoryStorage — file disimpan ke TiDB, bukan filesystem
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp3|wav|mpeg|mp4|webm|mov|quicktime/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname || mimetype) cb(null, true);
  else cb(new Error('Format file tidak didukung! Hanya gambar, video, PDF, dan MP3/WAV.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

function sendUploadError(res, error) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar. Maksimal 25MB per file.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: 'Jumlah file melebihi batas yang diizinkan.' });
    }
  }
  return res.status(400).json({ success: false, message: error.message || 'Gagal upload file' });
}

// GET /api/files/:id — Serve file dari TiDB (permanen, tidak bergantung filesystem)
router.get('/files/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [[file]] = await pool.query(
      'SELECT filename, mimetype, data FROM media_files WHERE id = ?',
      [req.params.id]
    );
    if (!file) return res.status(404).json({ success: false, message: 'File tidak ditemukan' });

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // cache 1 tahun
    res.send(file.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil file' });
  }
});

// POST /api/upload — Simpan ke TiDB
router.post('/upload', auth, (req, res) => {
  upload.single('file')(req, res, async error => {
    if (error) return sendUploadError(res, error);
    if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });

    try {
      const pool = await ensureMediaTable();
      const id = `file-${uuidv4().slice(0, 12)}`;
      await pool.query(
        'INSERT INTO media_files (id, filename, mimetype, data, size) VALUES (?, ?, ?, ?, ?)',
        [id, req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]
      );

      const fileUrl = `/api/files/${id}`;
      res.json({
        success: true,
        url: fileUrl,
        message: 'File berhasil diupload',
        filename: req.file.originalname,
        mimetype: req.file.mimetype
      });
    } catch (err) {
      console.error('Upload DB error:', err);
      res.status(500).json({ success: false, message: 'Gagal menyimpan file ke database' });
    }
  });
});

// POST /api/upload-multiple — Simpan banyak file ke TiDB
router.post('/upload-multiple', auth, (req, res) => {
  upload.array('files', 6)(req, res, async error => {
    if (error) return sendUploadError(res, error);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
    }

    try {
      const pool = await ensureMediaTable();
      const results = [];

      for (const file of req.files) {
        const id = `file-${uuidv4().slice(0, 12)}`;
        await pool.query(
          'INSERT INTO media_files (id, filename, mimetype, data, size) VALUES (?, ?, ?, ?, ?)',
          [id, file.originalname, file.mimetype, file.buffer, file.size]
        );
        results.push({
          url: `/api/files/${id}`,
          filename: file.originalname,
          mimetype: file.mimetype
        });
      }

      res.json({
        success: true,
        files: results,
        message: `${results.length} file berhasil diupload`
      });
    } catch (err) {
      console.error('Upload DB error:', err);
      res.status(500).json({ success: false, message: 'Gagal menyimpan file ke database' });
    }
  });
});

// DELETE /api/upload — Hapus file dari TiDB
router.delete('/upload', auth, async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, message: 'ID file diperlukan' });

  try {
    const pool = await getPool();
    // Support both old-style filename and new-style file ID
    const id = filename.startsWith('file-') ? filename : filename.replace('/api/files/', '');
    const [result] = await pool.query('DELETE FROM media_files WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
    }
    res.json({ success: true, message: 'File berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menghapus file' });
  }
});

// GET /api/uploads-list — Daftar file yang tersimpan di TiDB
router.get('/uploads-list', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [files] = await pool.query(
      'SELECT id, filename, mimetype, size, created_at FROM media_files ORDER BY created_at DESC'
    );
    const data = files.map(f => ({
      filename: f.id,
      url: `/api/files/${f.id}`,
      originalName: f.filename,
      mimetype: f.mimetype,
      size: f.size
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar file' });
  }
});

module.exports = router;
