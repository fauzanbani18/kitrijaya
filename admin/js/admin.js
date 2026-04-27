// ── AUTH ──────────────────────────────────────────────────────
const token = localStorage.getItem('admin_token');
if (!token && !window.location.pathname.includes('dashboard')) window.location.href = '/admin';
if (!token) window.location.href = '/admin';

async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    const htmlError = /<!doctype html|<html/i.test(text);
    throw new Error(htmlError ? 'Server belum memuat endpoint terbaru. Coba restart server backend.' : (text || 'Respons server tidak valid'));
  }
}

const API = (path, opts = {}) => fetch(path, {
  ...opts,
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
}).then(parseJsonResponse);

const fmt = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const $ = id => document.getElementById(id);
const toast = (msg, type = 'success') => {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  $('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
};

// ── MODAL ─────────────────────────────────────────────────────
let modalConfirmFn = null;
const openModal = (title, bodyHtml, confirmFn, confirmText = 'Simpan') => {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHtml;
  $('modal-confirm').innerHTML = `<i class="fas fa-save"></i> ${confirmText}`;
  modalConfirmFn = confirmFn;
  $('modal-overlay').style.display = 'flex';
};
const closeModal = () => {
  $('modal-overlay').style.display = 'none';
  $('modal-body').innerHTML = '';
  modalConfirmFn = null;
  quillEditor = null;
  productQuillEditor = null;
};
$('modal-close').onclick = closeModal;
$('modal-cancel').onclick = closeModal;
$('modal-overlay').onclick = e => { if (e.target === $('modal-overlay')) closeModal(); };
$('modal-confirm').onclick = () => { if (modalConfirmFn) modalConfirmFn(); };

// ── SIDEBAR ───────────────────────────────────────────────────
$('topbar-menu').onclick = () => $('sidebar').classList.toggle('open');
$('sidebar-close').onclick = () => $('sidebar').classList.remove('open');
$('logout-btn').onclick = () => { localStorage.removeItem('admin_token'); window.location.href = '/admin'; };

// ── NAVIGATION ────────────────────────────────────────────────
const sections = {
  dashboard: renderDashboard,
  hero: renderHero,
  about: renderAbout,
  categories: renderCategories,
  products: renderProducts,
  testimonials: renderTestimonials,
  articles: renderArticles,
  books: renderBooks,
  songs: renderSongs,
  contact: renderContact
};
const PRODUCT_MEDIA_LIMIT = 6;
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const sec = item.dataset.section;
    $('topbar-title').textContent = item.querySelector('span').textContent;
    if (sections[sec]) sections[sec]();
    $('sidebar').classList.remove('open');
  });
});

// ── FILE UPLOAD HELPER ───────────────────────────────────────
async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
  return parseJsonResponse(res);
}

async function uploadFiles(files) {
  const fd = new FormData();
  files.forEach(file => fd.append('files', file));
  const res = await fetch('/api/upload-multiple', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
  return parseJsonResponse(res);
}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getMediaType = (value = '') => {
  const source = typeof value === 'string' ? value.toLowerCase() : '';
  return /\.(mp4|webm|mov)(\?|$)/.test(source) ? 'video' : 'image';
};

const normalizeProductMedia = product => {
  let media = [];
  if (Array.isArray(product?.media)) media = product.media;
  else if (typeof product?.media === 'string' && product.media.trim()) {
    try { media = JSON.parse(product.media); } catch (error) { media = []; }
  }

  media = Array.isArray(media) ? media
    .map(item => ({ type: item?.type === 'video' ? 'video' : 'image', url: item?.url || '' }))
    .filter(item => item.url)
    .slice(0, PRODUCT_MEDIA_LIMIT) : [];

  if (!media.length && product?.image) media = [{ type: getMediaType(product.image), url: product.image }];
  return media;
};

function uploadZoneHtml(id, currentSrc = '', accept = 'image/*', isDoc = false) {
  let preview = '';
  if (currentSrc) {
    if (isDoc) preview = `<a href="${currentSrc}" target="_blank" class="current-doc"><i class="fas fa-file"></i> File saat ini</a>`;
    else preview = `<img src="${currentSrc}" class="current-img-preview" id="prev-${id}" />`;
  }
  
  const icon = isDoc ? 'fa-file-upload' : 'fa-cloud-upload-alt';
  const text = isDoc ? 'Klik atau seret file PDF/MP3 ke sini' : 'Klik atau seret gambar ke sini';
  const sub = isDoc ? 'PDF, MP3, WAV maks 25MB' : 'JPG, PNG, WebP maks 5MB';

  return `
    ${preview}
    <div class="upload-zone" id="zone-${id}" onclick="document.getElementById('file-${id}').click()">
      <i class="fas ${icon}"></i>
      <p>${text}</p>
      <small style="color:var(--muted)">${sub}</small>
      <input type="file" id="file-${id}" accept="${accept}" />
    </div>
    <input type="hidden" id="img-${id}" value="${currentSrc}" />`;
}

function initUploadZone(id, isDoc = false) {
  const fileInput = document.getElementById(`file-${id}`);
  if (!fileInput) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const zone = document.getElementById(`zone-${id}`);
    const icon = zone.querySelector('i');
    const text = zone.querySelector('p');
    const hint = zone.querySelector('small');
    const originalIcon = icon?.className;
    const originalText = text?.textContent;
    const originalHint = hint?.textContent;

    if (icon) icon.className = 'fas fa-spinner fa-spin';
    if (text) text.textContent = 'Mengupload...';

    const data = await uploadFile(file);
    if (data.success) {
      document.getElementById(`img-${id}`).value = data.url;
      if (icon) icon.className = isDoc ? 'fas fa-file-check' : 'fas fa-check-circle';
      if (text) text.textContent = isDoc ? data.filename : 'Upload berhasil';
      if (hint) hint.textContent = originalHint || '';

      if (!isDoc) {
        let preview = zone.querySelector('.upload-preview');
        if (!preview) {
          preview = document.createElement('img');
          preview.className = 'upload-preview';
          zone.insertBefore(preview, text || fileInput);
        }
        preview.src = data.url;
      }
    } else {
      if (icon && originalIcon) icon.className = originalIcon;
      if (text && originalText) text.textContent = originalText;
      toast(data.message || 'Gagal upload file', 'error');
    }

    fileInput.value = '';
  });
}

function multiUploadZoneHtml(id) {
  return `
    <div class="upload-zone multi-upload-zone" id="zone-${id}" onclick="document.getElementById('file-${id}').click()">
      <i class="fas fa-photo-film"></i>
      <p>Klik atau seret foto/video produk ke sini</p>
      <small style="color:var(--muted)">JPG, PNG, WebP, MP4, WebM, MOV. Minimal 1 file, maksimal ${PRODUCT_MEDIA_LIMIT} file.</small>
      <input type="file" id="file-${id}" accept="image/*,video/*" multiple />
    </div>
    <div class="media-upload-summary" id="summary-${id}"></div>
    <div class="media-preview-grid" id="preview-${id}"></div>`;
}

const uploadCollections = {};

function renderMediaPreview(id) {
  const preview = document.getElementById(`preview-${id}`);
  const summary = document.getElementById(`summary-${id}`);
  if (!preview || !summary) return;

  const items = uploadCollections[id]?.items || [];
  summary.textContent = `${items.length}/${PRODUCT_MEDIA_LIMIT} file dipilih`;

  if (!items.length) {
    preview.innerHTML = `<div class="media-empty-state">Belum ada media. Upload minimal 1 file produk.</div>`;
    return;
  }

  preview.innerHTML = items.map((item, index) => `
    <div class="media-preview-card">
      <button type="button" class="media-remove-btn" onclick="removeUploadedMedia('${id}', ${index})" aria-label="Hapus media">
        <i class="fas fa-times"></i>
      </button>
      ${item.type === 'video'
        ? `<video src="${item.url}" controls preload="metadata"></video>`
        : `<img src="${item.url}" alt="Media produk ${index + 1}" />`}
      <div class="media-preview-meta">
        <span>${item.type === 'video' ? 'Video' : 'Foto'} ${index + 1}</span>
        ${index === 0 ? '<strong>Media utama</strong>' : ''}
      </div>
    </div>`).join('');
}

async function handleMediaUpload(id, files) {
  if (!files?.length) return;

  const currentItems = uploadCollections[id]?.items || [];
  if (currentItems.length + files.length > PRODUCT_MEDIA_LIMIT) {
    toast(`Maksimal ${PRODUCT_MEDIA_LIMIT} file media produk`, 'error');
    return;
  }

  const zone = document.getElementById(`zone-${id}`);
  const icon = zone.querySelector('i');
  const text = zone.querySelector('p');
  const originalIcon = icon?.className;
  const originalText = text?.textContent;
  if (icon) icon.className = 'fas fa-spinner fa-spin';
  if (text) text.textContent = 'Mengupload media...';
  zone.style.pointerEvents = 'none';

  try {
    let uploadedItems = [];

    try {
      const data = await uploadFiles(files);
      if (!data.success) throw new Error(data.message || 'Gagal upload media');
      uploadedItems = (data.files || []).map(file => ({
        type: (file.mimetype || '').startsWith('video/') ? 'video' : 'image',
        url: file.url
      }));
      toast(data.message || 'Media produk berhasil diupload');
    } catch (batchError) {
      uploadedItems = [];
      for (const file of files) {
        const data = await uploadFile(file);
        if (!data.success) throw new Error(data.message || 'Gagal upload media');
        uploadedItems.push({
          type: (data.mimetype || file.type || '').startsWith('video/') ? 'video' : 'image',
          url: data.url
        });
      }
      toast('Media produk berhasil diupload');
    }

    currentItems.push(...uploadedItems);
    uploadCollections[id] = { items: currentItems };
    renderMediaPreview(id);
  } catch (error) {
    toast(error.message || 'Gagal upload media', 'error');
  } finally {
    if (icon && originalIcon) icon.className = originalIcon;
    if (text && originalText) text.textContent = originalText;
    zone.style.pointerEvents = '';
  }
}

function initMultiUploadZone(id, initialItems = []) {
  uploadCollections[id] = { items: initialItems.slice(0, PRODUCT_MEDIA_LIMIT) };
  renderMediaPreview(id);

  const fileInput = document.getElementById(`file-${id}`);
  const zone = document.getElementById(`zone-${id}`);
  if (!fileInput || !zone) return;

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    await handleMediaUpload(id, files);
  });

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    await handleMediaUpload(id, Array.from(e.dataTransfer?.files || []));
  });
}

function removeUploadedMedia(id, index) {
  const items = uploadCollections[id]?.items || [];
  items.splice(index, 1);
  renderMediaPreview(id);
}

window.removeUploadedMedia = removeUploadedMedia;

// ── DASHBOARD ─────────────────────────────────────────────────
async function renderDashboard() {
  $('main-content').innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
  const { data } = await API('/api/stats');
  $('main-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-box-open"></i></div><div><div class="stat-value">${data.totalProducts}</div><div class="stat-label">Total Produk</div></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-tags"></i></div><div><div class="stat-value">${data.totalCategories}</div><div class="stat-label">Kategori</div></div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-star"></i></div><div><div class="stat-value">${data.totalTestimonials}</div><div class="stat-label">Testimoni</div></div></div>
      <div class="stat-card"><div class="stat-icon pink"><i class="fas fa-fire"></i></div><div><div class="stat-value">${data.featuredProducts}</div><div class="stat-label">Produk Unggulan</div></div></div>
    </div>
    <div class="section-card">
      <div class="section-card-header"><div class="section-card-title"><i class="fas fa-info-circle"></i> Panduan Cepat</div></div>
      <p style="color:var(--text3);line-height:2">Gunakan menu di sidebar untuk mengelola konten website Anda:<br>
      🖼️ <strong>Hero Section</strong> – Ubah judul, subjudul, dan gambar utama website<br>
      🏪 <strong>Tentang Toko</strong> – Edit informasi dan deskripsi toko<br>
      🏷️ <strong>Kategori</strong> – Kelola kategori produk<br>
      📦 <strong>Produk</strong> – Tambah, edit, hapus produk beserta harga dan foto<br>
      ⭐ <strong>Testimoni</strong> – Kelola ulasan pelanggan<br>
      📞 <strong>Kontak</strong> – Perbarui alamat, nomor WhatsApp, dan media sosial</p>
    </div>`;
}

// ── HERO ──────────────────────────────────────────────────────
async function renderHero() {
  const { data } = await API('/api/content');
  const h = data.hero;
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header"><div class="section-card-title"><i class="fas fa-image"></i> Hero Section</div></div>
      <div class="form-group"><label class="form-label">Badge Text</label><input class="form-control" id="h-badge" value="${h.badge||''}" /></div>
      <div class="form-group"><label class="form-label">Judul Utama</label><input class="form-control" id="h-title" value="${h.title||''}" /></div>
      <div class="form-group"><label class="form-label">Subjudul</label><textarea class="form-control" id="h-subtitle">${h.subtitle||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Teks Tombol CTA</label><input class="form-control" id="h-ctatext" value="${h.ctaText||''}" /></div>
        <div class="form-group"><label class="form-label">Link Tombol CTA</label><input class="form-control" id="h-ctalink" value="${h.ctaLink||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Gambar Hero</label>${uploadZoneHtml('hero', h.image)}</div>
      <button class="btn-admin btn-primary" onclick="saveHero()"><i class="fas fa-save"></i> Simpan Perubahan</button>
    </div>`;
  initUploadZone('hero');
}

async function saveHero() {
  const body = { badge: $('h-badge').value, title: $('h-title').value, subtitle: $('h-subtitle').value, ctaText: $('h-ctatext').value, ctaLink: $('h-ctalink').value, image: $('img-hero').value };
  const r = await API('/api/hero', { method: 'PUT', body: JSON.stringify(body) });
  r.success ? toast(r.message) : toast(r.message, 'error');
}

// ── ABOUT ─────────────────────────────────────────────────────
async function renderAbout() {
  const { data } = await API('/api/content');
  const a = data.about;
  const statsJson = JSON.stringify(a.stats || []);
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header"><div class="section-card-title"><i class="fas fa-store"></i> Tentang Toko</div></div>
      <div class="form-group"><label class="form-label">Judul</label><input class="form-control" id="a-title" value="${a.title||''}" /></div>
      <div class="form-group"><label class="form-label">Deskripsi</label><textarea class="form-control" id="a-desc" style="min-height:120px">${a.description||''}</textarea></div>
      <div class="form-group"><label class="form-label">Misi</label><textarea class="form-control" id="a-mission">${a.mission||''}</textarea></div>
      <div class="form-group"><label class="form-label">Foto Toko</label>${uploadZoneHtml('about', a.image)}</div>
      <div class="form-group"><label class="form-label">Statistik (JSON)</label><textarea class="form-control" id="a-stats" style="min-height:120px;font-size:0.8rem">${statsJson}</textarea><div class="form-hint">Format: [{"label":"...","value":"..."}]</div></div>
      <button class="btn-admin btn-primary" onclick="saveAbout()"><i class="fas fa-save"></i> Simpan</button>
    </div>`;
  initUploadZone('about');
}

async function saveAbout() {
  let stats;
  try { stats = JSON.parse($('a-stats').value); } catch { return toast('Format JSON statistik tidak valid', 'error'); }
  const body = { title: $('a-title').value, description: $('a-desc').value, mission: $('a-mission').value, image: $('img-about').value, stats };
  const r = await API('/api/about', { method: 'PUT', body: JSON.stringify(body) });
  r.success ? toast(r.message) : toast(r.message, 'error');
}

// ── CATEGORIES ────────────────────────────────────────────────
let catsCache = [];
async function renderCategories() {
  const { data } = await API('/api/categories');
  catsCache = data;
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-tags"></i> Kategori Produk</div>
        <button class="btn-admin btn-primary" onclick="openCatModal()"><i class="fas fa-plus"></i> Tambah</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Nama Kategori</th><th>ID</th><th>Aksi</th></tr></thead>
        <tbody>${data.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${c.name}</strong></td>
            <td><span class="badge-pill badge-gray">${c.id}</span></td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="openCatModal('${c.id}','${c.name}')"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteCat('${c.id}','${c.name}')"><i class="fas fa-trash"></i> Hapus</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function openCatModal(id = '', name = '') {
  openModal(id ? 'Edit Kategori' : 'Tambah Kategori', `
    <div class="form-group"><label class="form-label">Nama Kategori</label><input class="form-control" id="cat-name" value="${name}" placeholder="cth: Seragam Pramuka" /></div>`,
    async () => {
      const nm = $('cat-name').value.trim();
      if (!nm) return toast('Nama kategori wajib diisi', 'error');
      const r = id ? await API(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name: nm }) })
                   : await API('/api/categories', { method: 'POST', body: JSON.stringify({ name: nm }) });
      r.success ? (toast(r.message), closeModal(), renderCategories()) : toast(r.message, 'error');
    });
}

async function deleteCat(id, name) {
  openModal('Hapus Kategori', `<p>Yakin ingin menghapus kategori <strong>"${name}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/categories/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderCategories()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── PRODUCTS ──────────────────────────────────────────────────
async function renderProducts() {
  const [prodRes, catRes] = await Promise.all([API('/api/products'), API('/api/categories')]);
  const products = prodRes.data; const cats = catRes.data; catsCache = cats;
  const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
  
  // Store products globally for edit access
  window.productsList = products;
  
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-box-open"></i> Produk (${products.length})</div>
        <button class="btn-admin btn-primary" onclick="openProdModal()"><i class="fas fa-plus"></i> Tambah Produk</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Foto</th><th>Nama Produk</th><th>Harga</th><th>Kategori</th><th>Media</th><th>Badge</th><th>Unggulan</th><th>Aksi</th></tr></thead>
        <tbody>${products.map(p => `
          <tr>
            <td><div class="product-thumb">${getProductThumbHtml(p)}</div></td>
            <td><strong>${p.name}</strong><br><small style="color:var(--muted)">${(p.description || '').slice(0,50)}...</small></td>
            <td>${fmt(p.price)}</td>
            <td>${catMap[p.category] || '-'}</td>
            <td><span class="badge-pill badge-blue">${normalizeProductMedia(p).length} file</span></td>
            <td>${p.badge ? `<span class="badge-pill badge-yellow">${p.badge}</span>` : '-'}</td>
            <td>${p.featured ? '<span class="badge-pill badge-green">Ya</span>' : '<span class="badge-pill badge-gray">Tidak</span>'}</td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="editProdById('${p.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteProd('${p.id}','${p.name.replace(/'/g, "&apos;")}')" title="Hapus"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function getProductThumbHtml(product) {
  const media = normalizeProductMedia(product);
  if (!media.length) return '<i class="fas fa-box"></i>';
  const cover = media.find(item => item.type === 'image') || media[0];
  if (cover.type === 'video') return '<div class="product-thumb-icon"><i class="fas fa-video"></i></div>';
  return `<img src="${cover.url}" alt="${escapeHtml(product.name || 'Produk')}" />`;
}

function openProdModal(pJson = '') {
  const p = pJson ? JSON.parse(pJson) : {};
  const catOpts = catsCache.map(c => `<option value="${c.id}" ${p.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  const mediaItems = normalizeProductMedia(p);
  openModal(p.id ? 'Edit Produk' : 'Tambah Produk', `
    <div class="form-group"><label class="form-label">Nama Produk</label><input class="form-control" id="p-name" value="${p.name||''}" /></div>
    <div class="form-group">
      <label class="form-label">Deskripsi Singkat <small>(ditampilkan di halaman utama, max 100 karakter)</small></label>
      <input class="form-control" id="p-short-desc" maxlength="100" placeholder="Deskripsi ringkas produk..." value="${p.short_description||''}" />
      <small id="short-desc-counter" style="color:var(--muted);font-size:12px">0/100</small>
    </div>
    <div class="form-group">
      <label class="form-label">Deskripsi Lengkap</label>
      <div id="product-quill-toolbar">
        <span class="ql-formats">
          <select class="ql-header">
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option selected>Normal</option>
          </select>
        </span>
        <span class="ql-formats">
          <select class="ql-size">
            <option value="small">Kecil</option>
            <option selected>Normal</option>
            <option value="large">Besar</option>
            <option value="huge">Sangat Besar</option>
          </select>
        </span>
        <span class="ql-formats">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-color"></select>
          <select class="ql-background"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered"></button>
          <button class="ql-list" value="bullet"></button>
          <button class="ql-indent" value="-1"></button>
          <button class="ql-indent" value="+1"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-align"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-link"></button>
          <button class="ql-blockquote"></button>
          <button class="ql-code-block"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-clean"></button>
        </span>
      </div>
      <div id="product-quill-editor-container"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Harga (Rp)</label><input class="form-control" id="p-price" type="number" value="${p.price||0}" /></div>
      <div class="form-group"><label class="form-label">Kategori</label><select class="form-control" id="p-cat"><option value="">-- Pilih --</option>${catOpts}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Badge (opsional)</label><input class="form-control" id="p-badge" value="${p.badge||''}" placeholder="Terlaris / Baru / Promo" /></div>
      <div class="form-group"><label class="form-label">Produk Unggulan</label>
        <select class="form-control" id="p-featured"><option value="false" ${!p.featured?'selected':''}>Tidak</option><option value="true" ${p.featured?'selected':''}>Ya</option></select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Media Produk</label>${multiUploadZoneHtml('prod-media')}</div>`,
    async () => {
      const media = uploadCollections['prod-media']?.items || [];
      const description = productQuillEditor ? productQuillEditor.root.innerHTML : '';
      const body = {
        name: $('p-name').value,
        short_description: $('p-short-desc').value,
        description,
        price: $('p-price').value,
        category: $('p-cat').value,
        badge: $('p-badge').value,
        featured: $('p-featured').value,
        image: media.find(item => item.type === 'image')?.url || media[0]?.url || '',
        media: JSON.stringify(media)
      };
      if (!body.name) return toast('Nama produk wajib diisi', 'error');
      if (!body.category) return toast('Kategori produk wajib dipilih', 'error');
      if (media.length < 1) return toast('Minimal 1 foto/video produk wajib diupload', 'error');
      const r = p.id ? await API(`/api/products/${p.id}`, { method: 'PUT', body: JSON.stringify(body) })
                     : await API('/api/products', { method: 'POST', body: JSON.stringify(body) });
      r.success ? (toast(r.message), closeModal(), renderProducts()) : toast(r.message, 'error');
    });
  setTimeout(() => {
    productQuillEditor = new Quill('#product-quill-editor-container', {
      modules: { toolbar: '#product-quill-toolbar' },
      theme: 'snow',
      placeholder: 'Tulis deskripsi lengkap produk di sini...'
    });
    if (p.description) productQuillEditor.root.innerHTML = p.description;
  }, 100);
  initMultiUploadZone('prod-media', mediaItems);
  // Add character counter untuk short description
  setTimeout(() => {
    const input = $('p-short-desc');
    if (input) {
      const updateCounter = () => {
        $('short-desc-counter').textContent = `${input.value.length}/100`;
      };
      input.addEventListener('input', updateCounter);
      updateCounter();
    }
  }, 100);
}

function editProdById(prodId) {
  const product = window.productsList?.find(p => p.id === prodId);
  if (!product) return toast('Produk tidak ditemukan', 'error');
  openProdModal(JSON.stringify(product));
}

async function deleteProd(id, name) {
  openModal('Hapus Produk', `<p>Yakin ingin menghapus produk <strong>"${name}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/products/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderProducts()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── TESTIMONIALS ──────────────────────────────────────────────
async function renderTestimonials() {
  const { data } = await API('/api/testimonials');
  
  // Store testimonials globally for edit access
  window.testimonialsList = data;
  
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-star"></i> Testimoni (${data.length})</div>
        <div style="display:flex; gap:10px;">
          <button class="btn-admin btn-secondary" onclick="syncReviews()"><i class="fab fa-google"></i> Sync Google Reviews</button>
          <button class="btn-admin btn-primary" onclick="openTestModal()"><i class="fas fa-plus"></i> Tambah</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Jabatan</th><th>Rating</th><th>Sumber</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td style="color:var(--text3)">${t.role}</td>
            <td><span style="color:#fbbf24">${'★'.repeat(t.rating)}</span></td>
            <td>${t.source === 'google' ? '<span class="badge-pill badge-green"><i class="fab fa-google"></i> Google</span>' : '<span class="badge-pill badge-gray">Manual</span>'}</td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="editTestById('${t.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteTest('${t.id}','${t.name.replace(/'/g, "&apos;")}')" title="Hapus"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

async function syncReviews() {
  $('main-content').innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Menyinkronkan dengan Google Maps...</p></div>';
  const r = await API('/api/sync-reviews', { method: 'POST' });
  r.success ? toast(r.message) : toast(r.message, 'error');
  renderTestimonials();
}

function openTestModal(tJson = '') {
  const t = tJson ? JSON.parse(tJson) : {};
  openModal(t.id ? 'Edit Testimoni' : 'Tambah Testimoni', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama</label><input class="form-control" id="t-name" value="${t.name||''}" /></div>
      <div class="form-group"><label class="form-label">Jabatan / Peran</label><input class="form-control" id="t-role" value="${t.role||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Rating (1-5)</label>
      <select class="form-control" id="t-rating">${[5,4,3,2,1].map(r=>`<option value="${r}" ${t.rating===r?'selected':''}>${'★'.repeat(r)} (${r})</option>`).join('')}</select>
    </div>
    <div class="form-group"><label class="form-label">Isi Testimoni</label><textarea class="form-control" id="t-content" style="min-height:100px">${t.content||''}</textarea></div>
    <div class="form-group"><label class="form-label">Foto Avatar (opsional)</label>${uploadZoneHtml('testi', t.avatar||'')}</div>`,
    async () => {
      const body = { name: $('t-name').value, role: $('t-role').value, content: $('t-content').value, rating: +$('t-rating').value, avatar: $('img-testi').value };
      if (!body.name || !body.content) return toast('Nama dan isi testimoni wajib diisi', 'error');
      const r = t.id ? await API(`/api/testimonials/${t.id}`, { method: 'PUT', body: JSON.stringify(body) })
                     : await API('/api/testimonials', { method: 'POST', body: JSON.stringify(body) });
      r.success ? (toast(r.message), closeModal(), renderTestimonials()) : toast(r.message, 'error');
    });
  initUploadZone('testi');
}

function editTestById(testId) {
  const testimonial = window.testimonialsList?.find(t => t.id === testId);
  if (!testimonial) return toast('Testimoni tidak ditemukan', 'error');
  openTestModal(JSON.stringify(testimonial));
}

async function deleteTest(id, name) {
  openModal('Hapus Testimoni', `<p>Yakin hapus testimoni dari <strong>"${name}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/testimonials/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderTestimonials()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── CONTACT ───────────────────────────────────────────────────
async function renderContact() {
  const { data } = await API('/api/content');
  const c = data.contact;
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header"><div class="section-card-title"><i class="fas fa-phone"></i> Informasi Kontak</div></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-map-marker-alt"></i> Alamat</label><textarea class="form-control" id="c-address">${c.address||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label"><i class="fas fa-phone"></i> Nomor Telepon</label><input class="form-control" id="c-phone" value="${c.phone||''}" /></div>
        <div class="form-group"><label class="form-label"><i class="fab fa-whatsapp"></i> Nomor WhatsApp</label><input class="form-control" id="c-wa" value="${c.whatsapp||''}" placeholder="6281234567890" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input class="form-control" id="c-email" value="${c.email||''}" /></div>
        <div class="form-group"><label class="form-label"><i class="fas fa-clock"></i> Jam Buka</label><input class="form-control" id="c-hours" value="${c.openHours||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label"><i class="fas fa-map"></i> Google Maps Embed URL</label><input class="form-control" id="c-maps" value="${c.mapsEmbed||''}" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label"><i class="fab fa-instagram"></i> Instagram URL</label><input class="form-control" id="c-ig" value="${c.instagram||''}" /></div>
        <div class="form-group"><label class="form-label"><i class="fab fa-facebook"></i> Facebook URL</label><input class="form-control" id="c-fb" value="${c.facebook||''}" /></div>
      </div>
      <div class="form-group"><label class="form-label"><i class="fab fa-tiktok"></i> TikTok URL</label><input class="form-control" id="c-tt" value="${c.tiktok||''}" /></div>
      <button class="btn-admin btn-primary" onclick="saveContact()"><i class="fas fa-save"></i> Simpan Perubahan</button>
    </div>`;
}

async function saveContact() {
  const body = { address: $('c-address').value, phone: $('c-phone').value, whatsapp: $('c-wa').value, email: $('c-email').value, openHours: $('c-hours').value, mapsEmbed: $('c-maps').value, instagram: $('c-ig').value, facebook: $('c-fb').value, tiktok: $('c-tt').value };
  const r = await API('/api/contact', { method: 'PUT', body: JSON.stringify(body) });
  r.success ? toast(r.message) : toast(r.message, 'error');
}

// ── ARTICLES ────────────────────────────────────────────────────
async function renderArticles() {
  const { data } = await API('/api/articles');
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-newspaper"></i> Artikel (${data.length})</div>
        <button class="btn-admin btn-primary" onclick="openArtModal()"><i class="fas fa-plus"></i> Tambah</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Gambar</th><th>Judul</th><th>Kutipan</th><th>Tanggal</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(a => `
          <tr>
            <td><img src="${a.image||'/images/placeholder.jpg'}" style="width:60px;height:40px;object-fit:cover;border-radius:4px"></td>
            <td><strong>${a.title}</strong></td>
            <td style="color:var(--text3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.excerpt}</td>
            <td style="color:var(--muted)">${new Date(a.created_at).toLocaleDateString('id-ID')}</td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="openArtModal(${JSON.stringify(JSON.stringify(a)).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteArt('${a.id}','${a.title.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

let quillEditor = null;
let productQuillEditor = null;

function openArtModal(aJson = '') {
  const a = aJson ? JSON.parse(aJson) : {};
  openModal(a.id ? 'Edit Artikel' : 'Tambah Artikel', `
    <div class="form-group"><label class="form-label">Judul Artikel</label><input class="form-control" id="a-title" value="${a.title||''}" /></div>
    <div class="form-group"><label class="form-label">Kutipan Singkat (Excerpt)</label><textarea class="form-control" id="a-excerpt" rows="2">${a.excerpt||''}</textarea></div>
    <div class="form-group">
      <label class="form-label">Konten Lengkap Artikel</label>
      <div id="quill-toolbar">
        <span class="ql-formats">
          <select class="ql-header">
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option selected>Normal</option>
          </select>
        </span>
        <span class="ql-formats">
          <select class="ql-size">
            <option value="small">Kecil</option>
            <option selected>Normal</option>
            <option value="large">Besar</option>
            <option value="huge">Sangat Besar</option>
          </select>
        </span>
        <span class="ql-formats">
          <button class="ql-bold" title="Tebal"></button>
          <button class="ql-italic" title="Miring"></button>
          <button class="ql-underline" title="Garis bawah"></button>
          <button class="ql-strike" title="Coret"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-color" title="Warna teks"></select>
          <select class="ql-background" title="Warna latar"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered" title="Daftar bernomor"></button>
          <button class="ql-list" value="bullet" title="Daftar titik"></button>
          <button class="ql-indent" value="-1" title="Kurangi indent"></button>
          <button class="ql-indent" value="+1" title="Tambah indent"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-align" title="Rata teks"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-link" title="Sisipkan link"></button>
          <button class="ql-blockquote" title="Kutipan"></button>
          <button class="ql-code-block" title="Kode"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-clean" title="Hapus format"></button>
        </span>
      </div>
      <div id="quill-editor-container"></div>
    </div>
    <div class="form-group"><label class="form-label">Gambar Header</label>${uploadZoneHtml('art', a.image||'', 'image/*')}</div>`,
    async () => {
      const content = quillEditor ? quillEditor.root.innerHTML : '';
      const body = { title: $('a-title').value, excerpt: $('a-excerpt').value, content, image: $('img-art').value };
      if (!body.title) return toast('Judul wajib diisi', 'error');
      if (!body.excerpt) return toast('Kutipan singkat wajib diisi', 'error');
      const r = a.id ? await API(`/api/articles/${a.id}`, { method: 'PUT', body: JSON.stringify(body) })
                     : await API('/api/articles', { method: 'POST', body: JSON.stringify(body) });
      r.success ? (toast(r.message), closeModal(), renderArticles()) : toast(r.message, 'error');
    });

  // Inisialisasi Quill setelah modal terbuka (modal butuh waktu render DOM)
  setTimeout(() => {
    quillEditor = new Quill('#quill-editor-container', {
      modules: { toolbar: '#quill-toolbar' },
      theme: 'snow',
      placeholder: 'Tulis konten artikel di sini...'
    });
    // Isi konten jika sedang edit
    if (a.content) {
      quillEditor.root.innerHTML = a.content;
    }
  }, 100);

  initUploadZone('art');
}


async function deleteArt(id, title) {
  openModal('Hapus Artikel', `<p>Yakin ingin menghapus artikel <strong>"${title}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/articles/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderArticles()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── BOOKS ───────────────────────────────────────────────────────
async function renderBooks() {
  const { data } = await API('/api/books');
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-book"></i> Buku Saku (${data.length})</div>
        <button class="btn-admin btn-primary" onclick="openBookModal()"><i class="fas fa-plus"></i> Tambah</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Judul Buku</th><th>Deskripsi</th><th>File URL</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(b => `
          <tr>
            <td><strong>${b.title}</strong></td>
            <td style="color:var(--text3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.description}</td>
            <td><a href="${b.file_url}" target="_blank" style="color:var(--primary-light)"><i class="fas fa-external-link-alt"></i> Buka File</a></td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="openBookModal(${JSON.stringify(JSON.stringify(b)).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteBook('${b.id}','${b.title.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function openBookModal(bJson = '') {
  const b = bJson ? JSON.parse(bJson) : {};
  openModal(b.id ? 'Edit Buku Saku' : 'Tambah Buku Saku', `
    <div class="form-group"><label class="form-label">Judul Buku Saku</label><input class="form-control" id="b-title" value="${b.title||''}" /></div>
    <div class="form-group"><label class="form-label">Deskripsi</label><textarea class="form-control" id="b-desc" rows="2">${b.description||''}</textarea></div>
    <div class="form-group"><label class="form-label">Upload File PDF</label>${uploadZoneHtml('book', b.file_url||'', 'application/pdf', true)}</div>`,
    async () => {
      const body = { title: $('b-title').value, description: $('b-desc').value, file_url: $('img-book').value };
      if (!body.title || !body.file_url) return toast('Judul dan file wajib diisi', 'error');
      const r = b.id ? await API(`/api/books/${b.id}`, { method: 'PUT', body: JSON.stringify(body) })
                     : await API('/api/books', { method: 'POST', body: JSON.stringify(body) });
      r.success ? (toast(r.message), closeModal(), renderBooks()) : toast(r.message, 'error');
    });
  initUploadZone('book', true);
}

async function deleteBook(id, title) {
  openModal('Hapus Buku', `<p>Yakin ingin menghapus buku <strong>"${title}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/books/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderBooks()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── SONGS ───────────────────────────────────────────────────────
async function renderSongs() {
  const { data } = await API('/api/songs');
  $('main-content').innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-title"><i class="fas fa-music"></i> Lagu Pramuka (${data.length})</div>
        <button class="btn-admin btn-primary" onclick="openSongModal()"><i class="fas fa-plus"></i> Tambah</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Judul Lagu</th><th>Pencipta / Penyanyi</th><th>File MP3</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(s => `
          <tr>
            <td><strong>${s.title}</strong></td>
            <td style="color:var(--text3)">${s.artist||'-'}</td>
            <td>
              <audio controls style="height:32px;width:200px">
                <source src="${s.file_url}" type="audio/mpeg">
              </audio>
            </td>
            <td><div class="td-actions">
              <button class="btn-admin btn-secondary btn-sm" onclick="openSongModal(${JSON.stringify(JSON.stringify(s)).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
              <button class="btn-admin btn-danger btn-sm" onclick="deleteSong('${s.id}','${s.title.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function openSongModal(sJson = '') {
  const s = sJson ? JSON.parse(sJson) : {};
  openModal(s.id ? 'Edit Lagu' : 'Tambah Lagu', `
    <div class="form-group"><label class="form-label">Judul Lagu</label><input class="form-control" id="s-title" value="${s.title||''}" /></div>
    <div class="form-group"><label class="form-label">Pencipta / Penyanyi</label><input class="form-control" id="s-artist" value="${s.artist||''}" /></div>
    <div class="form-group"><label class="form-label">Upload File Audio (MP3/WAV)</label>${uploadZoneHtml('song', s.file_url||'', 'audio/*', true)}</div>`,
    async () => {
      const body = { title: $('s-title').value, artist: $('s-artist').value, file_url: $('img-song').value };
      if (!body.title || !body.file_url) return toast('Judul dan file wajib diisi', 'error');
      const r = s.id ? await API(`/api/songs/${s.id}`, { method: 'PUT', body: JSON.stringify(body) })
                     : await API('/api/songs', { method: 'POST', body: JSON.stringify(body) });
      r.success ? (toast(r.message), closeModal(), renderSongs()) : toast(r.message, 'error');
    });
  initUploadZone('song', true);
}

async function deleteSong(id, title) {
  openModal('Hapus Lagu', `<p>Yakin ingin menghapus lagu <strong>"${title}"</strong>?</p>`,
    async () => {
      const r = await API(`/api/songs/${id}`, { method: 'DELETE' });
      r.success ? (toast(r.message), closeModal(), renderSongs()) : toast(r.message, 'error');
    }, 'Hapus');
}

// ── INIT ──────────────────────────────────────────────────────
sections.articles = renderArticles;
sections.books = renderBooks;
sections.songs = renderSongs;

renderDashboard();
