const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const router = express.Router();

function getUploadsDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL || process.env.LAMBDA_TASK_ROOT) return '/tmp/kitrijaya-uploads';
  return path.join(__dirname, '../uploads');
}

const uploadsDir = getUploadsDir();
fs.mkdirSync(uploadsDir, { recursive: true });

// Pakai memoryStorage agar tidak ada EROFS di Vercel — file ditulis manual
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

// POST /api/upload
router.post('/upload', auth, (req, res) => {
  upload.single('file')(req, res, error => {
    if (error) return sendUploadError(res, error);
    if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });

    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(req.file.originalname);
    const filePath = path.join(dir, filename);

    try {
      fs.writeFileSync(filePath, req.file.buffer);
    } catch (writeErr) {
      console.error('Upload write error:', writeErr.message);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan file: ' + writeErr.message });
    }

    res.json({
      success: true,
      url: `/uploads/${filename}`,
      message: 'File berhasil diupload',
      filename,
      mimetype: req.file.mimetype
    });
  });
});

// POST /api/upload-multiple
router.post('/upload-multiple', auth, (req, res) => {
  upload.array('files', 6)(req, res, error => {
    if (error) return sendUploadError(res, error);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
    }

    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    const results = [];

    for (const file of req.files) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + path.extname(file.originalname);
      try {
        fs.writeFileSync(path.join(dir, filename), file.buffer);
        results.push({ url: `/uploads/${filename}`, filename, mimetype: file.mimetype });
      } catch (writeErr) {
        console.error('Upload write error:', writeErr.message);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan file: ' + writeErr.message });
      }
    }

    res.json({
      success: true,
      files: results,
      message: `${results.length} file berhasil diupload`
    });
  });
});

// DELETE /api/upload
router.delete('/upload', auth, (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, message: 'Nama file diperlukan' });
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'File berhasil dihapus' });
  } else {
    res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }
});

// GET /api/uploads-list
router.get('/uploads-list', auth, (req, res) => {
  const files = fs.readdirSync(uploadsDir)
    .map(f => ({ filename: f, url: `/uploads/${f}` }));
  res.json({ success: true, data: files });
});

module.exports = router;
