const API = '';

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const $ = (id) => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);

let allProducts = [];
let allCategories = [];
let testimonials = [];
let sliderIndex = 0;

function normalizeProductMedia(product) {
  let items = [];
  if (Array.isArray(product?.media)) {
    items = product.media;
  } else if (typeof product?.media === 'string' && product.media.trim()) {
    try {
      items = JSON.parse(product.media);
    } catch (error) {
      items = [];
    }
  }
  items = Array.isArray(items) ? items.filter(item => item?.url) : [];
  if (items.length) return items;
  return product?.image ? [{ type: /\.(mp4|webm|mov)(\?|$)/i.test(product.image) ? 'video' : 'image', url: product.image }] : [];
}

function getProductCoverMedia(product) {
  const media = normalizeProductMedia(product);
  return media.find(item => item.type === 'image') || media[0] || null;
}

async function loadContent() {
  try {
    const res = await fetch(`${API}/api/content`);
    const { data } = await res.json();
    
    // Determine which page we are on
    const isHomePage = !!$('hero-title');
    const isArticlesPage = !!$('all-articles-grid');
    
    if (isHomePage) {
      renderHero(data.hero);
      renderAbout(data.about);
      renderProducts(data.products, 3);
      renderArticles(data.articles, 3, 'articles-grid');
      renderTestimonials(data.testimonials);
      renderContact(data.contact);
      initSlider();
    }
    
    if (isArticlesPage) {
      renderArticlesPage(data.articles);
    }
    
    if ($('books-list')) renderBooks(data.books);
    if ($('songs-list')) renderSongs(data.songs);

    allProducts = data.products;
    allCategories = data.categories;
    testimonials = data.testimonials;

    if ($('footer-year')) initFooter(data.contact);
  } catch (e) {
    console.error('❌ Gagal memuat konten:', e);
  }
}

// ── RENDER FUNCTIONS ──
function renderHero(h) {
  if (!h) return;
  if (h.badge) { $('hero-badge').querySelector('span').textContent = h.badge; }
  if (h.title) $('hero-title').innerHTML = h.title.replace('Kitri Jaya', '<span class="gradient-text">Kitri Jaya</span>');
  if (h.subtitle) $('hero-subtitle').textContent = h.subtitle;
  const cta = $('hero-cta');
  if (h.ctaText) cta.innerHTML = `<i class="fas fa-shopping-bag"></i> ${h.ctaText}`;
  if (h.ctaLink) cta.href = h.ctaLink;
  if (h.image) {
    const img = $('hero-img');
    img.src = h.image; img.style.display = 'block';
    $('hero-image-card').querySelector('.hero-image-placeholder').style.display = 'none';
  }
}

function renderAbout(a) {
  if (!a) return;
  if (a.title) $('about-title').innerHTML = a.title.replace('Kitri Jaya', '<span class="gradient-text">Kitri Jaya</span>');
  if (a.description) $('about-description').textContent = a.description;
  if (a.mission) $('about-mission').textContent = a.mission;
  if (a.image) {
    const img = $('about-img');
    img.src = a.image; img.style.display = 'block';
    $('about-img-placeholder').style.display = 'none';
  }
  if (a.stats && a.stats.length) {
    const container = $('about-stats');
    container.innerHTML = a.stats.map(s => `
      <div class="about-stat-item">
        <span class="about-stat-value">${s.value}</span>
        <span class="about-stat-label">${s.label}</span>
      </div>`).join('');
  }
}

function renderCategories(categories, products) {
  const filter = $('category-filter');
  if (!filter) return;
  filter.innerHTML = `<button class="filter-btn active" data-cat="all">Semua (${products.length})</button>`;
  categories.forEach(c => {
    const count = products.filter(p => p.category === c.id).length;
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = c.id;
    btn.textContent = `${c.name} (${count})`;
    filter.appendChild(btn);
  });
  filter.addEventListener('click', e => {
    if (!e.target.matches('.filter-btn')) return;
    filter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const cat = e.target.dataset.cat;
    const filtered = cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat);
    renderProducts(filtered);
  });
}

function getCategoryName(catId) {
  const c = allCategories.find(c => c.id === catId);
  return c ? c.name : '';
}

function renderProducts(products, limit = 0) {
  const grid = $('products-grid');
  if (!grid) return;
  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="products-loading"><i class="fas fa-box-open"></i><p>Belum ada produk</p></div>';
    return;
  }
  const display = limit > 0 ? products.slice(0, limit) : products;
  grid.innerHTML = display.map(p => {
    const badgeHtml = p.badge ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '';
    const cover = getProductCoverMedia(p);
    const imgHtml = cover
      ? (cover.type === 'video'
        ? `<div class="product-image-placeholder"><i class="fas fa-play-circle"></i></div>`
        : `<img src="${cover.url}" alt="${p.name}" loading="lazy" />`)
      : `<div class="product-image-placeholder"><i class="fas fa-box"></i></div>`;
    // Gunakan short_description jika ada, jika tidak gunakan description tapi dibatasi 80 karakter
    const desc = p.short_description || (p.description ? p.description.substring(0, 80) + (p.description.length > 80 ? '...' : '') : '');
    return `
      <div class="product-card" data-aos="fade-up" onclick="window.location.href='/product.html?id=${p.id}'" style="cursor:pointer">
        <div class="product-image">${imgHtml}${badgeHtml}</div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${desc}</div>
          <div class="product-price">${fmt(p.price)}</div>
          <div class="product-action">
            <a href="/product.html?id=${p.id}" class="btn-product btn-product-primary">
              <i class="fas fa-eye"></i> Detail
            </a>
            <button class="btn-product btn-product-wa" onclick="event.stopPropagation();waProduct('${p.name}','${p.price}')">
              <i class="fab fa-whatsapp"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
  observeAOS();
}

function renderArticles(articles, limit = 0, targetId = 'articles-grid') {
  const grid = $(targetId);
  if (!grid) return;
  if (!articles || articles.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1">Belum ada artikel</p>';
    return;
  }
  
  const displayArticles = limit > 0 ? articles.slice(0, limit) : articles;
  
  grid.innerHTML = displayArticles.map((a, i) => `
    <div class="article-card" style="cursor:pointer;animation:fadeUp 0.5s ease ${i * 0.12}s both" onclick="window.location.href='/article.html?id=${a.id}'">
      <img src="${a.image || '/images/placeholder.jpg'}" alt="${a.title}" class="article-img" onerror="this.src='/images/placeholder.jpg'">
      <div class="article-content">
        <span class="article-date"><i class="far fa-calendar-alt"></i> ${new Date(a.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
        <h3 class="article-title">${a.title}</h3>
        <p class="article-excerpt">${a.excerpt}</p>
        <a href="/article.html?id=${a.id}" class="article-read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></a>
      </div>
    </div>`).join('');
}

// Halaman daftar artikel (news portal layout)
function renderArticlesPage(articles) {
  const grid = $('all-articles-grid');
  if (!grid) return;
  if (!articles || articles.length === 0) {
    grid.innerHTML = '<p class="no-articles">Belum ada artikel yang dipublikasikan.</p>';
    return;
  }

  const [hero, ...rest] = articles;
  const heroDate = new Date(hero.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

  grid.innerHTML = `
    <a href="/article.html?id=${hero.id}" class="news-hero-card">
      <div class="news-hero-img-wrap">
        <img src="${hero.image || '/images/placeholder.jpg'}" alt="${hero.title}" onerror="this.src='/images/placeholder.jpg'">
        <span class="news-hero-badge"><i class="fas fa-fire"></i> Terbaru</span>
      </div>
      <div class="news-hero-body">
        <span class="news-hero-date"><i class="far fa-calendar-alt"></i> ${heroDate}</span>
        <h2 class="news-hero-title">${hero.title}</h2>
        <p class="news-hero-excerpt">${hero.excerpt}</p>
        <span class="news-hero-cta">Baca Artikel <i class="fas fa-arrow-right"></i></span>
      </div>
    </a>
    ${rest.length > 0 ? `
    <div class="news-list">
      ${rest.map((a, i) => {
        const d = new Date(a.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
        return `
        <a href="/article.html?id=${a.id}" class="news-list-card" style="animation:fadeUp 0.4s ease ${i * 0.1}s both">
          <img src="${a.image || '/images/placeholder.jpg'}" alt="${a.title}" class="news-list-img" onerror="this.src='/images/placeholder.jpg'">
          <div class="news-list-body">
            <span class="news-list-date"><i class="far fa-calendar-alt"></i> ${d}</span>
            <h3 class="news-list-title">${a.title}</h3>
            <p class="news-list-excerpt">${a.excerpt}</p>
          </div>
        </a>`;
      }).join('')}
    </div>` : ''}
  `;
}


async function loadArticleDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return window.location.href = '/articles.html';

  try {
    // Fetch artikel + data kontak secara paralel
    const [artRes, contentRes] = await Promise.all([
      fetch(`${API}/api/articles/${id}`),
      fetch(`${API}/api/content`)
    ]);
    const { data }           = await artRes.json();
    const { data: siteData } = await contentRes.json();
    if (!data) return window.location.href = '/articles.html';

    // ── Contact info untuk footer & WA ──
    const contact  = siteData?.contact;
    const waNumber = contact?.whatsapp || contact?.phone || '';
    const waUrl    = waNumber ? `https://wa.me/${waNumber.replace(/\D/g,'')}` : '#';
    if ($('floating-whatsapp')) $('floating-whatsapp').href = waUrl;
    if ($('footer-year'))    $('footer-year').textContent = new Date().getFullYear();
    if (contact?.address && $('footer-address')) $('footer-address').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${contact.address}`;
    if (contact?.phone   && $('footer-phone'))   $('footer-phone').innerHTML   = `<i class="fas fa-phone"></i> ${contact.phone}`;
    if (contact?.email   && $('footer-email'))   $('footer-email').innerHTML   = `<i class="fas fa-envelope"></i> ${contact.email}`;

    // ── Meta info ──
    const dateStr  = new Date(data.created_at).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    const pageUrl  = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(data.title);

    document.title = `${data.title} – Kitri Jaya`;
    if ($('page-desc')) $('page-desc').setAttribute('content', data.excerpt || data.title);
    if ($('breadcrumb-title')) $('breadcrumb-title').textContent = data.title;

    $('art-detail-title').textContent = data.title;
    $('art-detail-date').textContent  = dateStr;

    // ── View count awal (sebelum increment) ──
    if ($('art-views-count')) $('art-views-count').textContent = (data.views || 0).toLocaleString('id-ID');

    // ── Gambar header ──
    if (data.image) {
      $('art-detail-img').src = data.image;
      $('art-detail-img').style.display = 'block';
    }

    // ── Share links ──
    const waShare = `https://wa.me/?text=${pageTitle}%20${pageUrl}`;
    const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    if ($('share-wa'))        $('share-wa').href        = waShare;
    if ($('share-fb'))        $('share-fb').href        = fbShare;
    if ($('share-wa-bottom')) $('share-wa-bottom').href = waShare;
    if ($('share-fb-bottom')) $('share-fb-bottom').href = fbShare;

    // ── Konten artikel ──
    const isHtml = /<[a-z][\s\S]*>/i.test(data.content);
    if (isHtml) {
      $('art-detail-content').innerHTML = data.content;
    } else {
      const formatted = data.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
      $('art-detail-content').innerHTML = formatted || `<p>${data.content}</p>`;
    }

    // ── Tampilkan artikel ──
    if ($('art-loading'))   $('art-loading').style.display   = 'none';
    if ($('art-container')) $('art-container').style.display = 'block';

    // ── Increment view count (fire & forget) ──
    fetch(`${API}/api/articles/${id}/view`, { method: 'POST' })
      .then(r => r.json())
      .then(r => { if (r.success && $('art-views-count')) $('art-views-count').textContent = r.views.toLocaleString('id-ID'); })
      .catch(() => {});

  } catch (err) {
    console.error('Gagal memuat artikel:', err);
    if ($('art-loading')) $('art-loading').innerHTML = '<p style="color:#e74c3c;text-align:center"><i class="fas fa-exclamation-circle"></i> Gagal memuat artikel. <a href="/articles.html">Kembali</a></p>';
  }
}


function renderBooks(books) {
  const list = $('books-list');
  if (!books || books.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--muted)">Belum ada buku saku</p>';
    return;
  }
  list.innerHTML = books.map(b => `
    <div class="book-item" data-aos="fade-up">
      <div class="book-info">
        <div class="book-icon"><i class="fas fa-file-pdf"></i></div>
        <div>
          <div class="book-title">${b.title}</div>
          <div class="book-desc">${b.description}</div>
        </div>
      </div>
      <a href="${b.file_url}" target="_blank" class="btn-product btn-product-primary" style="width:auto;padding:8px 16px;border-radius:999px">
        <i class="fas fa-download"></i> Unduh
      </a>
    </div>`).join('');
}

function renderSongs(songs) {
  const list = $('songs-list');
  if (!songs || songs.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1">Belum ada lagu pramuka</p>';
    return;
  }
  list.innerHTML = songs.map(s => `
    <div class="song-card" data-aos="fade-up">
      <div class="song-header">
        <div class="song-icon"><i class="fas fa-music"></i></div>
        <div>
          <div class="song-title">${s.title}</div>
          <div class="song-artist">${s.artist || 'Pramuka'}</div>
        </div>
      </div>
      <audio controls class="song-player" preload="none">
        <source src="${s.file_url}" type="audio/mpeg">
        Browser Anda tidak mendukung audio.
      </audio>
      <div class="song-actions">
        <a href="${s.file_url}" download target="_blank" class="btn-product btn-product-primary" style="width:auto;padding:6px 12px;font-size:0.85rem">
          <i class="fas fa-download"></i> Unduh MP3
        </a>
      </div>
    </div>`).join('');
}

function renderTestimonials(tests) {
  if (!tests || !tests.length) return;
  testimonials = tests;
  const slider = $('testimonials-slider');
  slider.innerHTML = tests.map(t => {
    const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
    const avatarHtml = t.avatar
      ? `<img src="${t.avatar}" alt="${t.name}" />`
      : `<span>${t.name.charAt(0)}</span>`;
    return `
      <div class="testimonial-card">
        <div class="testimonial-stars">${stars}</div>
        <p class="testimonial-content">"${t.content}"</p>
        <div class="testimonial-author">
          <div class="author-avatar">${avatarHtml}</div>
          <div>
            <div class="author-name">${t.name}</div>
            <div class="author-role">${t.role}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderContact(c) {
  if (!c) return;
  if (c.address) $('contact-address').textContent = c.address;
  if (c.phone) { $('contact-phone-link').textContent = c.phone; $('contact-phone-link').href = `tel:${c.phone}`; }
  if (c.email) { $('contact-email-link').textContent = c.email; $('contact-email-link').href = `mailto:${c.email}`; }
  if (c.openHours) $('contact-hours').textContent = c.openHours;
  // Override map jika admin mengisi mapsEmbed dengan URL embed yang valid
  if (c.mapsEmbed && (c.mapsEmbed.includes('google.com/maps') || c.mapsEmbed.includes('openstreetmap.org'))) {
    $('map-iframe').src = c.mapsEmbed;
  }
  // Jika mapsEmbed kosong, URL default Google Maps di HTML tetap dipakai

  if (c.whatsapp) {
    const waUrl = `https://wa.me/${c.whatsapp}?text=Halo%20Kitri%20Jaya%2C%20saya%20ingin%20bertanya%20tentang%20produk%20pramuka.`;
    $('whatsapp-btn').href = waUrl;
    $('floating-whatsapp').href = waUrl;
  }
  if (c.instagram) $('social-instagram').href = c.instagram;
  if (c.facebook) $('social-facebook').href = c.facebook;
  if (c.tiktok) $('social-tiktok').href = c.tiktok;
}

function initFooter(c) {
  if ($('footer-year')) $('footer-year').textContent = new Date().getFullYear();
  if (c) {
    if (c.address && $('footer-address')) $('footer-address').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${c.address}`;
    if (c.phone && $('footer-phone'))   $('footer-phone').innerHTML   = `<i class="fas fa-phone"></i> ${c.phone}`;
    if (c.email && $('footer-email'))   $('footer-email').innerHTML   = `<i class="fas fa-envelope"></i> ${c.email}`;
  }
}

function initSlider() {
  const slider = $('testimonials-slider');
  const dots = $('slider-dots');
  const cards = slider.querySelectorAll('.testimonial-card');
  const total = cards.length;
  if (!total) return;
  const wrap = slider.closest('.testimonials-slider-wrap');
  const prevBtn = $('prev-btn');
  const nextBtn = $('next-btn');

  const perView = () => 3;
  const maxIdx = () => Math.max(0, Math.ceil(total / perView()) - 1);
  const stepSize = () => {
    const gap = parseFloat(window.getComputedStyle(slider).gap || '0');
    return perView() * (cards[0].getBoundingClientRect().width + gap);
  };

  function renderDots() {
    dots.innerHTML = Array.from({ length: maxIdx() + 1 }, (_, i) =>
      `<div class="slider-dot ${i === sliderIndex ? 'active' : ''}" data-idx="${i}"></div>`
    ).join('');
  }

  function goTo(idx) {
    sliderIndex = Math.max(0, Math.min(idx, maxIdx()));
    slider.style.transform = `translateX(-${sliderIndex * stepSize()}px)`;
    dots.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
    if (prevBtn) prevBtn.disabled = total <= perView();
    if (nextBtn) nextBtn.disabled = total <= perView();
  }

  renderDots();

  prevBtn.onclick = () => goTo(sliderIndex - 1);
  nextBtn.onclick = () => goTo(sliderIndex + 1);
  dots.addEventListener('click', e => { if (e.target.dataset.idx) goTo(+e.target.dataset.idx); });

  let autoplay = setInterval(() => goTo(sliderIndex >= maxIdx() ? 0 : sliderIndex + 1), 3000);
  wrap.addEventListener('mouseenter', () => clearInterval(autoplay));
  wrap.addEventListener('mouseleave', () => {
    autoplay = setInterval(() => goTo(sliderIndex >= maxIdx() ? 0 : sliderIndex + 1), 3000);
  });
  window.addEventListener('resize', () => {
    sliderIndex = Math.min(sliderIndex, maxIdx());
    renderDots();
    goTo(sliderIndex);
  });
  goTo(0);
}

function orderProduct(name, price) {
  const wa = document.querySelector('#floating-whatsapp');
  const waNum = wa.href.match(/wa\.me\/(\d+)/)?.[1] || '';
  if (waNum) {
    window.open(`https://wa.me/${waNum}?text=Halo%20Kitri%20Jaya%2C%20saya%20ingin%20memesan%20${encodeURIComponent(name)}%20seharga%20${encodeURIComponent(fmt(price))}.%20Apakah%20masih%20tersedia%3F`, '_blank');
  } else {
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
  }
}

function waProduct(name, price) { orderProduct(name, price); }

// ── NAVBAR SCROLL ──
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  $('back-to-top').classList.toggle('visible', window.scrollY > 300);
});

// ── HAMBURGER ──
$('hamburger').addEventListener('click', () => {
  $('nav-links').classList.toggle('open');
});

// Close menu when clicking outside or on a link
document.addEventListener('click', e => {
  const isHamburger = e.target.closest('#hamburger');
  const isNavLink = e.target.closest('#nav-links a');
  const isOutside = !e.target.closest('.navbar');
  
  if (isNavLink || isOutside) {
    $('nav-links').classList.remove('open');
  }
});

// ── BACK TO TOP ──
$('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ── AOS (Animate on Scroll) ──
function observeAOS() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('aos-animate'); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('art-detail-content')) {
    loadArticleDetail();
  } else {
    // Panggil observeAOS setelah content selesai dimuat
    loadContent().then(() => observeAOS());
  }
  observeAOS(); // observasi elemen statis dulu
  if ($('footer-year')) $('footer-year').textContent = new Date().getFullYear();
});
