'use strict';
const API_URL = '/api';

// ══════════════════════════════════════════════════════════
// JWT AUTH HELPERS (Netlify — pas de session cookie)
// ══════════════════════════════════════════════════════════
function getToken() { return localStorage.getItem('emeraude_token') || ''; }
function setToken(t) { localStorage.setItem('emeraude_token', t); }
function clearToken() { localStorage.removeItem('emeraude_token'); }

function authHeaders(extra = {}) {
    const t = getToken();
    return {
        'Content-Type': 'application/json',
        ...(t ? { 'Authorization': 'Bearer ' + t } : {}),
        ...extra,
    };
}

function authHeadersMultipart() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
}


// ══════════════════════════════════════════════════════════
// UPLOAD ENGINE — une seule implémentation centralisée
// ══════════════════════════════════════════════════════════

async function uploadFile(file, onProgress) {
    const fd = new FormData();
    fd.append('file', file);
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
        });
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
            else reject(new Error('Upload échoué: ' + xhr.status));
        });
        xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
        xhr.open('POST', `${API_URL}/upload`);
        const tok = getToken(); if (tok) xhr.setRequestHeader('Authorization', 'Bearer ' + tok);
        xhr.send(fd);
    });
}

/**
 * initUpload(config)
 * config = { zoneId, previewId, previewStyle ('strip'|'grid'), single, onUrl }
 * Retourne { getUrls, setUrl, clear }
 */
function initUpload({ zoneId, previewId, previewStyle = 'strip', single = false, onUrl }) {
    const zone = document.getElementById(zoneId);
    const preview = document.getElementById(previewId);
    if (!zone || !preview) return { getUrls: () => [], setUrl: () => {}, clear: () => {} };

    let urls = [];

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !single;
    input.style.display = 'none';
    document.body.appendChild(input);

    zone.addEventListener('click', e => { e.stopPropagation(); input.click(); });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dz-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dz-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dz-over'); handle(e.dataTransfer.files); });
    input.addEventListener('change', e => handle(e.target.files));

    async function handle(files) {
        if (single) { urls = []; preview.innerHTML = ''; }
        for (const file of files) {
            const id = 'p' + Math.random().toString(36).slice(2);
            const wrap = document.createElement('div');
            wrap.className = previewStyle === 'grid' ? 'upv-grid-item' : 'upv-strip-item';
            wrap.id = id;
            wrap.innerHTML = `<div class="upv-progress"><div class="upv-bar"></div></div>`;
            preview.appendChild(wrap);

            try {
                const result = await uploadFile(file, pct => {
                    const bar = wrap.querySelector('.upv-bar');
                    if (bar) bar.style.width = pct + '%';
                });
                urls.push(result.url);
                wrap.innerHTML = `<img src="${result.url}" alt=""><button class="upv-remove" data-url="${result.url}" title="Retirer">×</button>`;
                wrap.querySelector('.upv-remove').addEventListener('click', e => {
                    e.stopPropagation();
                    const u = e.target.dataset.url;
                    urls = urls.filter(x => x !== u);
                    wrap.remove();
                });
                if (onUrl) onUrl(result.url);
            } catch (err) {
                wrap.remove();
                showToast('Erreur upload: ' + err.message, 'error');
            }
        }
        input.value = '';
    }

    return {
        getUrls: () => [...urls],
        setUrl: (url) => { urls = [url]; },
        clear: () => { urls = []; preview.innerHTML = ''; }
    };
}

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════

async function checkAuth() {
    try {
        const token = getToken();
        if (!token) { showLogin(); return; }
        const res = await fetch(`${API_URL}/check-auth`, {
            headers: { 'Authorization': 'Bearer ' + token, 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) { clearToken(); showLogin(); return; }
        showDashboard();
        await initDashboard();
    } catch {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    if (u) u.value = '';
    if (p) p.value = '';
}

function showDashboard() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
}

async function handleLogout() {
    clearToken();
    showToast('Déconnexion réussie', 'success');
    setTimeout(() => { showLogin(); }, 600);
}

// ══════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
    let box = document.getElementById('toast-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        box.className = 'toast-container';
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : 'ℹ ') + message;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function formatPrice(p) {
    return new Intl.NumberFormat('fr-FR').format(p) + ' FCFA';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

let _confirmCallback = null;
function confirmAction(msg, cb) {
    _confirmCallback = cb;
    document.getElementById('confirm-message').textContent = msg;
    openModal('confirm-modal');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════

const SECTION_TITLES = {
    stats:'Tableau de bord', settings:'Paramètres', rooms:'Chambres',
    reservations:'Réservations', gallery:'Galerie', services:'Services',
    amenities:'Commodités', testimonials:'Témoignages', contacts:'Messages', newsletter:'Newsletter'
};

function showSection(id) {
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => {
        l.classList.toggle('active', l.dataset.section === id);
    });
    document.querySelectorAll('.admin-section-page').forEach(s => {
        s.classList.toggle('active', s.id === 'section-' + id);
    });
    const tt = document.getElementById('topbar-title');
    if (tt) tt.textContent = SECTION_TITLES[id] || 'Admin';

    const loaders = {
        stats: loadStats,
        rooms: loadAdminRooms,
        reservations: loadAdminReservations,
        gallery: loadAdminGallery,
        services: loadAdminServices,
        amenities: loadAdminAmenities,
        testimonials: loadAdminTestimonials,
        contacts: loadAdminContacts,
        newsletter: loadAdminNewsletter
    };
    if (loaders[id]) loaders[id]();
}

// ══════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════

const SETTING_FIELDS = ['logo','hotel_name','hotel_tagline','hotel_description','address',
    'phone1','phone2','email','facebook','instagram','whatsapp',
    'google_maps','checkin_time','checkout_time','currency','hero_image','hero_title','hero_subtitle'];

let _logoUpload = null;
let _heroUpload = null;

async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const s = await res.json();
        SETTING_FIELDS.forEach(k => {
            const el = document.getElementById(`setting-${k}`);
            if (el) el.value = s[k] || '';
        });
        // Logos
        ['login-logo','sidebar-logo'].forEach(id => {
            const el = document.getElementById(id);
            if (el && s.logo) el.src = s.logo;
        });
        const lp = document.getElementById('logo-preview');
        if (lp && s.logo) { lp.src = s.logo; lp.style.display = 'block'; }
        const hp = document.getElementById('hero-preview');
        if (hp && s.hero_image) { hp.src = s.hero_image; hp.style.display = 'block'; }
    } catch(e) { console.error('loadSettings:', e); }
}

async function saveSettings() {
    const data = {};
    SETTING_FIELDS.forEach(k => {
        const el = document.getElementById(`setting-${k}`);
        if (el) data[k] = el.value;
    });
    // Include uploaded logo/hero if set
    const logoUploadUrls = _logoUpload ? _logoUpload.getUrls() : [];
    if (logoUploadUrls.length) data.logo = logoUploadUrls[0];
    const heroUploadUrls = _heroUpload ? _heroUpload.getUrls() : [];
    if (heroUploadUrls.length) data.hero_image = heroUploadUrls[0];

    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            
            body: JSON.stringify(data)
        });
        if (res.ok) { showToast('Paramètres enregistrés ✓'); loadSettings(); }
        else showToast('Erreur lors de l\'enregistrement', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
}

// ══════════════════════════════════════════════════════════
// DASHBOARD INIT
// ══════════════════════════════════════════════════════════

async function initDashboard() {
    await loadSettings();
    await loadStats();

    // Init upload zones paramètres
    _logoUpload = initUpload({
        zoneId: 'logo-upload-zone', previewId: 'logo-upload-preview',
        previewStyle: 'strip', single: true,
        onUrl: url => {
            document.getElementById('setting-logo').value = url;
            const lp = document.getElementById('logo-preview');
            if (lp) { lp.src = url; lp.style.display = 'block'; }
        }
    });
    _heroUpload = initUpload({
        zoneId: 'hero-upload-zone', previewId: 'hero-upload-preview',
        previewStyle: 'strip', single: true,
        onUrl: url => {
            document.getElementById('setting-hero_image').value = url;
            const hp = document.getElementById('hero-preview');
            if (hp) { hp.src = url; hp.style.display = 'block'; }
        }
    });

    // Init galerie upload
    initGalleryUploadZone();
}

async function loadStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const s = await res.json();
        const map = {
            'stat-rooms': s.rooms_total,
            'stat-available': s.rooms_available,
            'stat-reservations': s.reservations_total,
            'stat-pending': s.reservations_pending,
            'stat-contacts': s.contacts_total,
            'stat-newsletter': s.newsletter_total
        };
        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? '0';
        });
        setBadge('badge-rooms', s.rooms_total);
        setBadge('badge-reservations', s.reservations_pending);
        setBadge('badge-contacts', s.contacts_total);
    } catch(e) { console.error('loadStats:', e); }
}

function setBadge(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.classList.toggle('hidden', !n || n == 0);
}

// ══════════════════════════════════════════════════════════
// CHAMBRES
// ══════════════════════════════════════════════════════════

let _roomMainUpload = null;
let _roomGalleryUpload = null;

async function loadAdminRooms() {
    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        const tbody = document.querySelector('#rooms-table tbody');
        if (!tbody) return;
        setBadge('badge-rooms', rooms.length);
        if (!rooms.length) {
            tbody.innerHTML = emptyState('🏨', 'Aucune chambre', 'Cliquez sur "Nouvelle chambre"');
            return;
        }
        tbody.innerHTML = rooms.map(r => {
            const imgCount = (r.images||[]).length;
            return `<tr>
                <td><img src="${escapeHtml(r.image)}" alt="${escapeHtml(r.name)}" style="width:52px;height:40px;object-fit:cover;border-radius:6px"></td>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td><span class="badge-type">${escapeHtml(r.type)}</span></td>
                <td><strong>${formatPrice(r.price)}</strong></td>
                <td>${r.capacity} pers.</td>
                <td><span class="status-badge status-${r.status}">${r.status==='available'?'✅ Disponible':'🔴 Occupée'}</span></td>
                <td>${imgCount} photo${imgCount>1?'s':''}</td>
                <td class="actions-cell">
                    <button class="act-btn act-edit" onclick="editRoom(${r.id})" title="Modifier">✏️</button>
                    <button class="act-btn act-del" onclick="deleteRoom(${r.id})" title="Supprimer">🗑️</button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { console.error('loadAdminRooms:', e); }
}

function openRoomModal(room = null) {
    const form = document.getElementById('room-form');
    const title = document.getElementById('room-modal-title');
    form.reset();
    document.getElementById('room-id').value = '';

    // Reset upload zones
    if (_roomMainUpload) _roomMainUpload.clear();
    if (_roomGalleryUpload) _roomGalleryUpload.clear();
    const mp = document.getElementById('room-main-preview-img');
    if (mp) { mp.src=''; mp.style.display='none'; }

    // Initialiser les upload zones (idempotent)
    _roomMainUpload = initUpload({
        zoneId: 'room-main-upload-zone', previewId: 'room-main-upload-preview',
        previewStyle: 'strip', single: true,
        onUrl: url => {
            document.getElementById('room-image').value = url;
            const img = document.getElementById('room-main-preview-img');
            if (img) { img.src = url; img.style.display = 'block'; }
        }
    });
    _roomGalleryUpload = initUpload({
        zoneId: 'room-gallery-upload-zone', previewId: 'room-gallery-upload-preview',
        previewStyle: 'grid'
    });

    if (room) {
        title.textContent = 'Modifier la chambre';
        document.getElementById('room-id').value = room.id;
        document.getElementById('room-name').value = room.name;
        document.getElementById('room-type').value = room.type;
        document.getElementById('room-price').value = room.price;
        document.getElementById('room-capacity').value = room.capacity;
        document.getElementById('room-status').value = room.status;
        document.getElementById('room-image').value = room.image || '';
        document.getElementById('room-desc').value = room.description || '';
        if (room.image && mp) { mp.src = room.image; mp.style.display = 'block'; }
    } else {
        title.textContent = 'Nouvelle chambre';
    }
    openModal('room-modal');
}

async function editRoom(id) {
    try {
        const res = await fetch(`${API_URL}/rooms/${id}`);
        const room = await res.json();
        openRoomModal(room);
    } catch { showToast('Impossible de charger la chambre', 'error'); }
}

async function deleteRoom(id) {
    confirmAction('Supprimer définitivement cette chambre ?', async () => {
        try {
            const res = await fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) { showToast('Chambre supprimée'); loadAdminRooms(); loadStats(); }
            else showToast('Erreur suppression', 'error');
        } catch { showToast('Erreur réseau', 'error'); }
    });
}

async function saveRoom(e) {
    e.preventDefault();
    const id = document.getElementById('room-id').value;

    const mainUrl = document.getElementById('room-image').value;
    const galleryUrls = _roomGalleryUpload ? _roomGalleryUpload.getUrls() : [];

    const data = {
        name: document.getElementById('room-name').value,
        type: document.getElementById('room-type').value,
        price: parseFloat(document.getElementById('room-price').value),
        capacity: parseInt(document.getElementById('room-capacity').value),
        status: document.getElementById('room-status').value,
        image: mainUrl,
        images: galleryUrls,
        description: document.getElementById('room-desc').value
    };

    const url = id ? `${API_URL}/rooms/${id}` : `${API_URL}/rooms`;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showToast(id ? 'Chambre mise à jour ✓' : 'Chambre créée ✓');
            closeModal('room-modal');
            loadAdminRooms();
            loadStats();
        } else {
            const err = await res.json();
            showToast(err.error || 'Erreur', 'error');
        }
    } catch { showToast('Erreur réseau', 'error'); }
}

// ══════════════════════════════════════════════════════════
// RÉSERVATIONS
// ══════════════════════════════════════════════════════════

async function loadAdminReservations() {
    try {
        const res = await fetch(`${API_URL}/reservations`, { headers: authHeaders() });
        const list = await res.json();
        const tbody = document.querySelector('#reservations-table tbody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = emptyState('📋', 'Aucune réservation', 'Les réservations apparaîtront ici');
            return;
        }
        const statusLabel = { pending:'⏳ En attente', confirmed:'✅ Confirmée', cancelled:'❌ Annulée', completed:'🏁 Terminée' };
        tbody.innerHTML = list.map(r => `
            <tr>
                <td>#${r.id}</td>
                <td><strong>${escapeHtml(r.client_name)}</strong><br><small>${escapeHtml(r.client_email||'')}</small></td>
                <td>${escapeHtml(r.phone)}</td>
                <td>${escapeHtml(r.room_name)}</td>
                <td>${fmtDate(r.checkin_date)}</td>
                <td>${fmtDate(r.checkout_date)}</td>
                <td><strong>${formatPrice(r.total_price)}</strong></td>
                <td><span class="status-badge status-${r.status}">${statusLabel[r.status]||r.status}</span></td>
                <td class="actions-cell">
                    ${r.status==='pending'?`<button class="act-btn act-approve" onclick="updateResStatus(${r.id},'confirmed')" title="Confirmer">✓</button>`:''}
                    ${r.status!=='cancelled'?`<button class="act-btn act-warn" onclick="updateResStatus(${r.id},'cancelled')" title="Annuler">✕</button>`:''}
                    <button class="act-btn act-del" onclick="deleteReservation(${r.id})" title="Supprimer">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

async function updateResStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/reservations/${id}/status`, {
            method:'PUT', headers: authHeaders(),
            body: JSON.stringify({status})
        });
        if (res.ok) { showToast(`Statut mis à jour : ${status}`); loadAdminReservations(); loadStats(); }
        else showToast('Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
}

async function deleteReservation(id) {
    confirmAction('Supprimer cette réservation ?', async () => {
        await fetch(`${API_URL}/reservations/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Réservation supprimée');
        loadAdminReservations(); loadStats();
    });
}

// ══════════════════════════════════════════════════════════
// GALERIE — upload + CRUD complet
// ══════════════════════════════════════════════════════════

let _galleryUpload = null;
let _galleryEditUpload = null;
let _pendingGalleryUrls = [];

function initGalleryUploadZone() {
    _pendingGalleryUrls = [];
    _galleryUpload = initUpload({
        zoneId: 'gallery-upload-zone',
        previewId: 'gallery-upload-preview',
        previewStyle: 'grid',
        onUrl: url => _pendingGalleryUrls.push(url)
    });
}

async function saveGalleryUploads() {
    const title = document.getElementById('gallery-title').value.trim();
    const category = document.getElementById('gallery-category').value;
    const urls = _galleryUpload ? _galleryUpload.getUrls() : [];

    if (!urls.length) {
        showToast('Uploadez au moins une photo d\'abord', 'error');
        return;
    }
    let ok = 0;
    for (const url of urls) {
        try {
            const res = await fetch(`${API_URL}/gallery`, {
                method:'POST', headers: authHeaders(),
                body: JSON.stringify({ title, image: url, category })
            });
            if (res.ok) ok++;
        } catch {}
    }
    showToast(`${ok} photo${ok>1?'s':''} ajoutée${ok>1?'s':''} à la galerie ✓`);
    document.getElementById('gallery-title').value = '';
    if (_galleryUpload) _galleryUpload.clear();
    _pendingGalleryUrls = [];
    loadAdminGallery();
}

async function loadAdminGallery() {
    try {
        const res = await fetch(`${API_URL}/gallery`);
        const items = await res.json();
        const grid = document.getElementById('gallery-admin-grid');
        if (!grid) return;

        if (!items.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#999">${emptyState('🖼️','Aucune photo','Uploadez des photos ci-dessus')}</div>`;
            return;
        }
        grid.innerHTML = items.map(item => `
            <div class="gallery-admin-item" data-id="${item.id}">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title||'')}">
                <div class="gallery-admin-overlay">
                    <span class="gallery-admin-title">${escapeHtml(item.title||'Sans titre')}</span>
                    <span class="gallery-admin-cat">${escapeHtml(item.category||'')}</span>
                </div>
                <div class="gallery-admin-actions">
                    <button class="act-btn act-edit" onclick="openGalleryEdit(${item.id})" title="Modifier">✏️</button>
                    <button class="act-btn act-del" onclick="deleteGalleryItem(${item.id})" title="Supprimer">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

function openGalleryEdit(id) {
    fetch(`${API_URL}/gallery`)
        .then(r => r.json())
        .then(items => {
            const item = items.find(i => i.id === id);
            if (!item) return;
            document.getElementById('gallery-edit-id').value = id;
            document.getElementById('gallery-edit-title').value = item.title || '';
            document.getElementById('gallery-edit-category').value = item.category || 'espaces';
            document.getElementById('gallery-edit-image').value = item.image || '';
            const gep = document.getElementById('gallery-edit-preview');
            if (gep) { gep.src = item.image || ''; gep.style.display = item.image ? 'block' : 'none'; }

            // (Re)init upload dans le modal edit
            _galleryEditUpload = initUpload({
                zoneId: 'gallery-edit-upload-zone', previewId: 'gallery-edit-upload-preview',
                previewStyle: 'strip', single: true,
                onUrl: url => {
                    document.getElementById('gallery-edit-image').value = url;
                    const p = document.getElementById('gallery-edit-preview');
                    if (p) { p.src = url; p.style.display = 'block'; }
                }
            });
            openModal('gallery-edit-modal');
        });
}

async function saveGalleryEdit() {
    const id = document.getElementById('gallery-edit-id').value;
    const image = document.getElementById('gallery-edit-image').value;
    const title = document.getElementById('gallery-edit-title').value;
    const category = document.getElementById('gallery-edit-category').value;

    if (!image) { showToast('Image requise', 'error'); return; }

    try {
        // DELETE + re-create (API n'a pas de PUT galerie, on recrée)
        await fetch(`${API_URL}/gallery/${id}`, { method:'DELETE', headers: authHeaders() });
        await fetch(`${API_URL}/gallery`, {
            method:'POST', headers: authHeaders(),
            body: JSON.stringify({ title, image, category })
        });
        showToast('Photo mise à jour ✓');
        closeModal('gallery-edit-modal');
        loadAdminGallery();
    } catch { showToast('Erreur', 'error'); }
}

async function deleteGalleryItem(id) {
    confirmAction('Supprimer cette photo ?', async () => {
        try {
            await fetch(`${API_URL}/gallery/${id}`, { method:'DELETE', headers: authHeaders() });
            showToast('Photo supprimée');
            loadAdminGallery();
        } catch { showToast('Erreur', 'error'); }
    });
}

// ══════════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════════

async function loadAdminServices() {
    try {
        const res = await fetch(`${API_URL}/services`);
        const list = await res.json();
        const tbody = document.querySelector('#services-table tbody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = emptyState('🛎️','Aucun service','Ajoutez des services'); return; }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(s.icon||'–')}</td>
                <td>${escapeHtml(s.description||'–')}</td>
                <td>${escapeHtml(s.price||'Sur devis')}</td>
                <td class="actions-cell">
                    <button class="act-btn act-edit" onclick="editServiceItem(${s.id})">✏️</button>
                    <button class="act-btn act-del" onclick="deleteServiceItem(${s.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

function openServiceModal(service = null) {
    document.getElementById('service-id').value = service ? service.id : '';
    document.getElementById('service-modal-title').textContent = service ? 'Modifier le service' : 'Nouveau service';
    document.getElementById('service-name').value = service ? service.name : '';
    document.getElementById('service-icon').value = service ? (service.icon||'') : '';
    document.getElementById('service-desc').value = service ? (service.description||'') : '';
    document.getElementById('service-price').value = service ? (service.price||'') : '';
    openModal('service-modal');
}

async function editServiceItem(id) {
    const res = await fetch(`${API_URL}/services`);
    const list = await res.json();
    const s = list.find(x => x.id === id);
    if (s) openServiceModal(s);
}

async function saveService() {
    const id = document.getElementById('service-id').value;
    const data = {
        name: document.getElementById('service-name').value,
        icon: document.getElementById('service-icon').value,
        description: document.getElementById('service-desc').value,
        price: document.getElementById('service-price').value
    };
    if (!data.name) { showToast('Nom requis', 'error'); return; }

    try {
        if (id) {
            // DELETE + re-create (API sans PUT service)
            await fetch(`${API_URL}/services/${id}`, { method:'DELETE', headers: authHeaders() });
        }
        const res = await fetch(`${API_URL}/services`, {
            method:'POST', headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) { showToast(id ? 'Service mis à jour ✓' : 'Service ajouté ✓'); closeModal('service-modal'); loadAdminServices(); }
        else showToast('Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
}

async function deleteServiceItem(id) {
    confirmAction('Supprimer ce service ?', async () => {
        await fetch(`${API_URL}/services/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Service supprimé');
        loadAdminServices();
    });
}

// ══════════════════════════════════════════════════════════
// COMMODITÉS
// ══════════════════════════════════════════════════════════

const AMENITY_ICONS = { wifi:'📶', snowflake:'❄️', water:'🏊', car:'🚗', coffee:'☕', 'concierge-bell':'🛎️', tv:'📺', lock:'🔒' };

async function loadAdminAmenities() {
    try {
        const res = await fetch(`${API_URL}/amenities`);
        const list = await res.json();
        const tbody = document.querySelector('#amenities-table tbody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = emptyState('✨','Aucune commodité','Ajoutez des commodités'); return; }
        tbody.innerHTML = list.map(a => `
            <tr>
                <td style="font-size:1.5rem">${AMENITY_ICONS[a.icon]||'✨'}</td>
                <td><strong>${escapeHtml(a.name)}</strong></td>
                <td>${escapeHtml(a.description||'–')}</td>
                <td class="actions-cell">
                    <button class="act-btn act-edit" onclick="editAmenity(${a.id})">✏️</button>
                    <button class="act-btn act-del" onclick="deleteAmenity(${a.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

function openAmenityModal(amenity = null) {
    document.getElementById('amenity-id').value = amenity ? amenity.id : '';
    document.getElementById('amenity-modal-title').textContent = amenity ? 'Modifier la commodité' : 'Nouvelle commodité';
    document.getElementById('amenity-name').value = amenity ? amenity.name : '';
    document.getElementById('amenity-icon').value = amenity ? (amenity.icon||'') : '';
    document.getElementById('amenity-desc').value = amenity ? (amenity.description||'') : '';
    openModal('amenity-modal');
}

async function editAmenity(id) {
    const res = await fetch(`${API_URL}/amenities`);
    const list = await res.json();
    const a = list.find(x => x.id === id);
    if (a) openAmenityModal(a);
}

async function saveAmenity() {
    const id = document.getElementById('amenity-id').value;
    const data = {
        name: document.getElementById('amenity-name').value,
        icon: document.getElementById('amenity-icon').value,
        description: document.getElementById('amenity-desc').value
    };
    if (!data.name) { showToast('Nom requis', 'error'); return; }
    try {
        if (id) await fetch(`${API_URL}/amenities/${id}`, { method:'DELETE', headers: authHeaders() });
        const res = await fetch(`${API_URL}/amenities`, {
            method:'POST', headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) { showToast(id ? 'Commodité mise à jour ✓' : 'Commodité ajoutée ✓'); closeModal('amenity-modal'); loadAdminAmenities(); }
        else showToast('Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
}

async function deleteAmenity(id) {
    confirmAction('Supprimer cette commodité ?', async () => {
        await fetch(`${API_URL}/amenities/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Commodité supprimée');
        loadAdminAmenities();
    });
}

// ══════════════════════════════════════════════════════════
// TÉMOIGNAGES
// ══════════════════════════════════════════════════════════

async function loadAdminTestimonials() {
    try {
        const res = await fetch(`${API_URL}/testimonials`);
        const list = await res.json();
        const tbody = document.querySelector('#testimonials-table tbody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = emptyState('⭐','Aucun témoignage','Les avis clients apparaîtront ici'); return; }
        tbody.innerHTML = list.map(t => `
            <tr>
                <td><strong>${escapeHtml(t.client_name)}</strong></td>
                <td>${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</td>
                <td>${escapeHtml(t.comment.substring(0,80))}${t.comment.length>80?'…':''}</td>
                <td>${fmtDate(t.date)}</td>
                <td><button class="act-btn act-del" onclick="deleteTestimonial(${t.id})">🗑️</button></td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

async function deleteTestimonial(id) {
    confirmAction('Supprimer ce témoignage ?', async () => {
        await fetch(`${API_URL}/testimonials/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Témoignage supprimé');
        loadAdminTestimonials();
    });
}

// ══════════════════════════════════════════════════════════
// CONTACTS
// ══════════════════════════════════════════════════════════

async function loadAdminContacts() {
    try {
        const res = await fetch(`${API_URL}/contacts`, { headers: authHeaders() });
        const list = await res.json();
        const tbody = document.querySelector('#contacts-table tbody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = emptyState('📨','Aucun message','Les messages apparaîtront ici'); return; }
        tbody.innerHTML = list.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td><a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></td>
                <td>${escapeHtml(c.subject||'–')}</td>
                <td class="msg-cell">${escapeHtml(c.message.substring(0,70))}${c.message.length>70?'…':''}</td>
                <td>${fmtDate(c.date)}</td>
                <td><button class="act-btn act-del" onclick="deleteContact(${c.id})">🗑️</button></td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

async function deleteContact(id) {
    confirmAction('Supprimer ce message ?', async () => {
        await fetch(`${API_URL}/contacts/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Message supprimé');
        loadAdminContacts(); loadStats();
    });
}

// ══════════════════════════════════════════════════════════
// NEWSLETTER
// ══════════════════════════════════════════════════════════

async function loadAdminNewsletter() {
    try {
        const res = await fetch(`${API_URL}/newsletter`, { headers: authHeaders() });
        const list = await res.json();
        const tbody = document.querySelector('#newsletter-table tbody');
        if (!tbody) return;
        if (!list.length) { tbody.innerHTML = emptyState('📧','Aucun abonné','Les inscriptions apparaîtront ici'); return; }
        tbody.innerHTML = list.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.email)}</strong></td>
                <td>${fmtDate(s.date)}</td>
                <td><button class="act-btn act-del" onclick="deleteNewsletter(${s.id})">🗑️</button></td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

async function deleteNewsletter(id) {
    confirmAction('Désinscrire cet abonné ?', async () => {
        await fetch(`${API_URL}/newsletter/${id}`, { method:'DELETE', headers: authHeaders() });
        showToast('Abonné supprimé');
        loadAdminNewsletter(); loadStats();
    });
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function fmtDate(d) {
    if (!d) return '–';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

function emptyState(icon, title, sub) {
    return `<tr><td colspan="99"><div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3><p>${sub}</p>
    </div></td></tr>`;
}

// ══════════════════════════════════════════════════════════
// DOM READY
// ══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // ─── Login ───
    document.getElementById('login-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('.login-btn');
        const txt = document.getElementById('login-text');
        const spin = document.getElementById('login-spinner');
        const err = document.getElementById('login-error');
        btn.disabled = true;
        if (txt) txt.textContent = 'Connexion...';
        if (spin) spin.classList.remove('hidden');
        if (err) err.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            const data = await res.json();
            if (data.success) {
                setToken(data.token);
                showToast('Connexion réussie ✓');
                setTimeout(checkAuth, 400);
            } else {
                if (err) { err.textContent = data.message || 'Identifiants incorrects'; err.classList.remove('hidden'); }
                else showToast(data.message || 'Identifiants incorrects', 'error');
            }
        } catch {
            if (err) { err.textContent = 'Erreur serveur'; err.classList.remove('hidden'); }
        } finally {
            btn.disabled = false;
            if (txt) txt.textContent = 'Se connecter';
            if (spin) spin.classList.add('hidden');
        }
    });

    // ─── Logout ───
    document.getElementById('logout-btn')?.addEventListener('click', e => { e.preventDefault(); handleLogout(); });

    // ─── Sidebar nav ───
    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.section);
            if (window.innerWidth <= 1024) {
                document.getElementById('admin-sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('active');
            }
        });
    });

    // ─── Sidebar toggle ───
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('admin-sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        document.getElementById('admin-sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    });

    // ─── Settings tabs ───
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.settings-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
        });
    });

    // ─── Room form submit ───
    document.getElementById('room-form')?.addEventListener('submit', saveRoom);

    // ─── Confirm modal ───
    document.getElementById('confirm-yes-btn')?.addEventListener('click', () => {
        closeModal('confirm-modal');
        if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });

    // ─── Close modals on overlay click ───
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // ─── Live preview: logo URL field ───
    document.getElementById('setting-logo')?.addEventListener('input', e => {
        const lp = document.getElementById('logo-preview');
        if (lp) { lp.src = e.target.value; lp.style.display = e.target.value ? 'block' : 'none'; }
    });
    document.getElementById('setting-hero_image')?.addEventListener('input', e => {
        const hp = document.getElementById('hero-preview');
        if (hp) { hp.src = e.target.value; hp.style.display = e.target.value ? 'block' : 'none'; }
    });
    document.getElementById('room-image')?.addEventListener('input', e => {
        const ip = document.getElementById('room-main-preview-img');
        if (ip) { ip.src = e.target.value; ip.style.display = e.target.value ? 'block' : 'none'; }
    });
    document.getElementById('gallery-edit-image')?.addEventListener('input', e => {
        const ep = document.getElementById('gallery-edit-preview');
        if (ep) { ep.src = e.target.value; ep.style.display = e.target.value ? 'block' : 'none'; }
    });

    // ─── Lancer ───
    checkAuth();
});
