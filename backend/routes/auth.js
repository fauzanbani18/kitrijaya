const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kitrijaya-secret-key-2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const admin = rows[0];
    const isValid = bcrypt.compareSync(password, admin.password);
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, message: 'Login berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }
    
    const pool = getPool();
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    // Asumsi kita mengubah password untuk admin pertama atau admin yang login (menggunakan username dari token)
    await pool.query('UPDATE admins SET password = ? WHERE username = ?', [hashedPassword, req.user.username]);
    
    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// GET /api/auth/verify
router.get('/verify', require('../middleware/auth'), (req, res) => {
  res.json({ success: true, message: 'Token valid' });
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
