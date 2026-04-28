const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load .env only if it exists (local development)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const { initDB } = require('./config/db');

function getUploadsDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL || process.env.LAMBDA_TASK_ROOT) return '/tmp/kitrijaya-uploads';
  return path.join(__dirname, 'uploads');
}

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = getUploadsDir();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(uploadsDir));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure uploads directory exists
fs.mkdirSync(uploadsDir, { recursive: true });

// Inisialisasi MySQL DB
initDB();

// Routes
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const uploadRoutes = require('./routes/upload');
const googleReviewsRoutes = require('./routes/google_reviews');

app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', uploadRoutes);
app.use('/api', googleReviewsRoutes);

// Serve admin login page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Serve admin dashboard
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

// Fallback to landing page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏕️  Kitri Jaya Server berjalan di http://localhost:${PORT}`);
  console.log(`🌐 Landing Page  : http://localhost:${PORT}`);
  console.log(`🔧 Admin CMS     : http://localhost:${PORT}/admin`);
  console.log(`📦 API Endpoint  : http://localhost:${PORT}/api\n`);
});
