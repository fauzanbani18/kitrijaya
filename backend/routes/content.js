const express = require('express');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');
const router = express.Router();

function sanitizeProductMedia(media) {
  let items = media;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (error) {
      items = [];
    }
  }

  if (!Array.isArray(items)) return [];

  return items
    .map(item => ({
      type: item?.type === 'video' ? 'video' : 'image',
      url: typeof item?.url === 'string' ? item.url.trim() : ''
    }))
    .filter(item => item.url)
    .slice(0, 6);
}

function normalizeProduct(product) {
  if (!product) return product;

  const media = sanitizeProductMedia(product.media);
  const fallbackMedia = media.length ? media : (product.image ? [{ type: 'image', url: product.image }] : []);
  const coverImage = fallbackMedia.find(item => item.type === 'image')?.url || fallbackMedia[0]?.url || product.image || '';

  return {
    ...product,
    featured: Boolean(product.featured),
    image: coverImage,
    media: fallbackMedia
  };
}

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/content — All landing page content
router.get('/content', async (req, res) => {
  try {
    const pool = getPool();
    const [[hero]] = await pool.query('SELECT * FROM hero WHERE id = 1');
    const [[about]] = await pool.query('SELECT * FROM about WHERE id = 1');
    const [[contact]] = await pool.query('SELECT * FROM contact WHERE id = 1');
    const [categories] = await pool.query('SELECT * FROM categories');
    const [products] = await pool.query('SELECT * FROM products');
    const [testimonials] = await pool.query('SELECT * FROM testimonials');
    const [articles] = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    const [books] = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
    const [songs] = await pool.query('SELECT * FROM songs ORDER BY created_at DESC');

    // Parse JSON field for stats
    if (about && typeof about.stats === 'string') {
      try { about.stats = JSON.parse(about.stats); } catch (e) { about.stats = []; }
    }

    res.json({
      success: true,
      data: {
        hero: hero || {},
        about: about || {},
        contact: contact || {},
        categories,
        products: products.map(normalizeProduct),
        testimonials,
        articles,
        books,
        songs
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
});

// GET /api/articles/:id — Public route to read a single article
router.get('/articles/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [[article]] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (!article) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });
    res.json({ success: true, data: article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil artikel' });
  }
});

// POST /api/articles/:id/view — Increment view count
router.post('/articles/:id/view', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = ?', [req.params.id]);
    const [[article]] = await pool.query('SELECT views FROM articles WHERE id = ?', [req.params.id]);
    res.json({ success: true, views: article?.views || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update views' });
  }
});

// GET /api/products
router.get('/products', async (req, res) => {
  try {
    const pool = getPool();
    const { category, featured } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (featured === 'true') {
      query += ' AND featured = true';
    }

    const [products] = await pool.query(query, params);

    res.json({ success: true, data: products.map(normalizeProduct) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil produk' });
  }
});

// GET /api/products/:id — Detail produk
router.get('/products/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    res.json({ success: true, data: normalizeProduct(product) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil produk' });
  }
});

// ─── ADMIN ENDPOINTS (Auth Required) ──────────────────────────────────────────

// --- HERO ---
router.put('/hero', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { title, subtitle, ctaText, ctaLink, badge, image } = req.body;
    await pool.query(
      'UPDATE hero SET title=?, subtitle=?, ctaText=?, ctaLink=?, badge=?, image=? WHERE id=1',
      [title, subtitle, ctaText, ctaLink, badge, image]
    );
    res.json({ success: true, message: 'Hero section berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update hero' });
  }
});

// --- ABOUT ---
router.put('/about', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { title, description, mission, image, stats } = req.body;
    const statsStr = Array.isArray(stats) ? JSON.stringify(stats) : stats;
    await pool.query(
      'UPDATE about SET title=?, description=?, mission=?, image=?, stats=? WHERE id=1',
      [title, description, mission, image, statsStr]
    );
    res.json({ success: true, message: 'About section berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update about' });
  }
});

// --- CONTACT ---
router.put('/contact', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { address, phone, whatsapp, email, mapsEmbed, instagram, facebook, tiktok, openHours } = req.body;
    await pool.query(
      'UPDATE contact SET address=?, phone=?, whatsapp=?, email=?, mapsEmbed=?, instagram=?, facebook=?, tiktok=?, openHours=? WHERE id=1',
      [address, phone, whatsapp, email, mapsEmbed, instagram, facebook, tiktok, openHours]
    );
    res.json({ success: true, message: 'Kontak berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update kontak' });
  }
});

// --- CATEGORIES ---
router.get('/categories', auth, async (req, res) => {
  const [data] = await getPool().query('SELECT * FROM categories');
  res.json({ success: true, data });
});

router.post('/categories', auth, async (req, res) => {
  try {
    const pool = getPool();
    const id = `cat-${uuidv4().slice(0,8)}`;
    const { name } = req.body;
    await pool.query('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
    res.json({ success: true, data: { id, name }, message: 'Kategori berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal tambah kategori' });
  }
});

router.put('/categories/:id', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { name } = req.body;
    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ success: true, message: 'Kategori berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update kategori' });
  }
});

router.delete('/categories/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori' });
  }
});

// --- PRODUCTS ---
router.post('/products', auth, async (req, res) => {
  try {
    const pool = getPool();
    const id = `prod-${uuidv4().slice(0,8)}`;
    const { name, short_description, description, price, category, image, badge, featured, media } = req.body;
    const isFeatured = featured === true || featured === 'true';
    const mediaItems = sanitizeProductMedia(media);
    if (mediaItems.length < 1 || mediaItems.length > 6) {
      return res.status(400).json({ success: false, message: 'Media produk wajib 1 sampai 6 file' });
    }
    const coverImage = mediaItems.find(item => item.type === 'image')?.url || mediaItems[0]?.url || image || '';
    await pool.query(
      'INSERT INTO products (id, name, short_description, description, price, category, image, media, badge, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, short_description, description, Number(price) || 0, category, coverImage, JSON.stringify(mediaItems), badge, isFeatured]
    );
    res.json({ success: true, message: 'Produk berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal tambah produk' });
  }
});

router.put('/products/:id', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { name, short_description, description, price, category, image, badge, featured, media } = req.body;
    const isFeatured = featured === true || featured === 'true';
    const mediaItems = sanitizeProductMedia(media);
    if (mediaItems.length < 1 || mediaItems.length > 6) {
      return res.status(400).json({ success: false, message: 'Media produk wajib 1 sampai 6 file' });
    }
    const coverImage = mediaItems.find(item => item.type === 'image')?.url || mediaItems[0]?.url || image || '';
    await pool.query(
      'UPDATE products SET name=?, short_description=?, description=?, price=?, category=?, image=?, media=?, badge=?, featured=? WHERE id=?',
      [name, short_description, description, Number(price) || 0, category, coverImage, JSON.stringify(mediaItems), badge, isFeatured, req.params.id]
    );
    res.json({ success: true, message: 'Produk berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update produk' });
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal hapus produk' });
  }
});

// --- TESTIMONIALS ---
router.get('/testimonials', auth, async (req, res) => {
  const [data] = await getPool().query('SELECT * FROM testimonials ORDER BY id DESC');
  res.json({ success: true, data });
});

router.post('/testimonials', auth, async (req, res) => {
  try {
    const pool = getPool();
    const id = `test-${uuidv4().slice(0,8)}`;
    const { name, role, content, rating, avatar } = req.body;
    await pool.query(
      'INSERT INTO testimonials (id, name, role, content, rating, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, role, content, Number(rating) || 5, avatar]
    );
    res.json({ success: true, message: 'Testimoni berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal tambah testimoni' });
  }
});

router.put('/testimonials/:id', auth, async (req, res) => {
  try {
    const pool = getPool();
    const { name, role, content, rating, avatar } = req.body;
    await pool.query(
      'UPDATE testimonials SET name=?, role=?, content=?, rating=?, avatar=? WHERE id=?',
      [name, role, content, Number(rating) || 5, avatar, req.params.id]
    );
    res.json({ success: true, message: 'Testimoni berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update testimoni' });
  }
});

router.delete('/testimonials/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Testimoni berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal hapus testimoni' });
  }
});

// --- ARTICLES ---
router.get('/articles', auth, async (req, res) => {
  const [data] = await getPool().query('SELECT * FROM articles ORDER BY created_at DESC');
  res.json({ success: true, data });
});

router.post('/articles', auth, async (req, res) => {
  try {
    const id = `art-${uuidv4().slice(0,8)}`;
    const { title, excerpt, content, image } = req.body;
    await getPool().query(
      'INSERT INTO articles (id, title, excerpt, content, image) VALUES (?, ?, ?, ?, ?)',
      [id, title, excerpt, content, image]
    );
    res.json({ success: true, message: 'Artikel berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal tambah artikel' });
  }
});

router.put('/articles/:id', auth, async (req, res) => {
  try {
    const { title, excerpt, content, image } = req.body;
    await getPool().query(
      'UPDATE articles SET title=?, excerpt=?, content=?, image=? WHERE id=?',
      [title, excerpt, content, image, req.params.id]
    );
    res.json({ success: true, message: 'Artikel berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update artikel' });
  }
});

router.delete('/articles/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Artikel berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal hapus artikel' });
  }
});

// --- BOOKS ---
router.get('/books', auth, async (req, res) => {
  const [data] = await getPool().query('SELECT * FROM books ORDER BY created_at DESC');
  res.json({ success: true, data });
});

router.post('/books', auth, async (req, res) => {
  try {
    const id = `book-${uuidv4().slice(0,8)}`;
    const { title, description, file_url } = req.body;
    await getPool().query(
      'INSERT INTO books (id, title, description, file_url) VALUES (?, ?, ?, ?)',
      [id, title, description, file_url]
    );
    res.json({ success: true, message: 'Buku Saku berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal tambah buku saku' });
  }
});

router.put('/books/:id', auth, async (req, res) => {
  try {
    const { title, description, file_url } = req.body;
    await getPool().query(
      'UPDATE books SET title=?, description=?, file_url=? WHERE id=?',
      [title, description, file_url, req.params.id]
    );
    res.json({ success: true, message: 'Buku Saku berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update buku saku' });
  }
});

router.delete('/books/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Buku Saku berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal hapus buku saku' });
  }
});

// --- SONGS ---
router.get('/songs', auth, async (req, res) => {
  const [data] = await getPool().query('SELECT * FROM songs ORDER BY created_at DESC');
  res.json({ success: true, data });
});

router.post('/songs', auth, async (req, res) => {
  try {
    const id = `song-${uuidv4().slice(0,8)}`;
    const { title, artist, file_url } = req.body;
    await getPool().query(
      'INSERT INTO songs (id, title, artist, file_url) VALUES (?, ?, ?, ?)',
      [id, title, artist, file_url]
    );
    res.json({ success: true, message: 'Lagu Pramuka berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal tambah lagu pramuka' });
  }
});

router.put('/songs/:id', auth, async (req, res) => {
  try {
    const { title, artist, file_url } = req.body;
    await getPool().query(
      'UPDATE songs SET title=?, artist=?, file_url=? WHERE id=?',
      [title, artist, file_url, req.params.id]
    );
    res.json({ success: true, message: 'Lagu Pramuka berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update lagu pramuka' });
  }
});

router.delete('/songs/:id', auth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM songs WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Lagu Pramuka berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal hapus lagu pramuka' });
  }
});

// --- STATS (for admin dashboard) ---
router.get('/stats', auth, async (req, res) => {
  try {
    const pool = getPool();
    const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');
    const [[{ totalCategories }]] = await pool.query('SELECT COUNT(*) as totalCategories FROM categories');
    const [[{ totalTestimonials }]] = await pool.query('SELECT COUNT(*) as totalTestimonials FROM testimonials');
    const [[{ totalArticles }]] = await pool.query('SELECT COUNT(*) as totalArticles FROM articles');
    const [[{ totalBooks }]] = await pool.query('SELECT COUNT(*) as totalBooks FROM books');
    const [[{ totalSongs }]] = await pool.query('SELECT COUNT(*) as totalSongs FROM songs');
    
    res.json({
      success: true,
      data: { totalProducts, totalCategories, totalTestimonials, totalArticles, totalBooks, totalSongs }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
  }
});

module.exports = router;
