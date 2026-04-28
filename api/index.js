const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load .env only if it exists (local development)
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const { getPool } = require('../backend/config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'backend', 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize DB on startup
let dbInitialized = false;
const initializeDatabase = async () => {
  if (!dbInitialized) {
    try {
      console.log('🔄 Testing database connection...');
      const pool = await getPool();
      dbInitialized = true;
      console.log('✅ Database connection test successful');
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
    }
  }
};

// Routes
const authRoutes = require('../backend/routes/auth');
const contentRoutes = require('../backend/routes/content');
const uploadRoutes = require('../backend/routes/upload');
const googleReviewsRoutes = require('../backend/routes/google_reviews');

app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', uploadRoutes);
app.use('/api', googleReviewsRoutes);

// Serve admin login page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// Serve admin dashboard
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

// Fallback to landing page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Initialize database before handling requests
initializeDatabase();

module.exports = app;
