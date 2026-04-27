const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.post('/sync-reviews', auth, async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;

    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(400).json({ 
        success: false, 
        message: 'Google Places API Key belum dikonfigurasi di file .env' 
      });
    }

    if (!placeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google Place ID belum dikonfigurasi di file .env' 
      });
    }

    // Ambil ulasan dari Google Places API
    const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&language=id&key=${apiKey}`;
    
    const response = await axios.get(googleApiUrl);
    
    if (response.data.status !== 'OK') {
      console.error('Google API Error:', response.data);
      return res.status(400).json({ 
        success: false, 
        message: 'Gagal mengambil data dari Google API. Periksa API Key atau Place ID.' 
      });
    }

    const reviews = response.data.result.reviews || [];
    
    if (reviews.length === 0) {
      return res.json({ success: true, message: 'Tidak ada ulasan baru ditemukan di Google Maps.' });
    }

    const pool = getPool();
    let syncedCount = 0;

    for (const review of reviews) {
      // Cek apakah ulasan sudah ada berdasarkan author_name (simplifikasi)
      // Dalam implementasi nyata, lebih baik menyimpan review_id dari google jika ada
      const [existing] = await pool.query(
        'SELECT id FROM testimonials WHERE name = ? AND source = "google"', 
        [review.author_name]
      );

      if (existing.length === 0) {
        const id = `test-g-${uuidv4().slice(0,6)}`;
        await pool.query(
          'INSERT INTO testimonials (id, name, role, content, rating, avatar, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id, 
            review.author_name, 
            'Pelanggan (Google Maps)', 
            review.text, 
            review.rating, 
            review.profile_photo_url, 
            'google'
          ]
        );
        syncedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Berhasil mensinkronisasi ${syncedCount} ulasan baru dari Google Maps.` 
    });

  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat sinkronisasi ulasan.' });
  }
});

module.exports = router;
