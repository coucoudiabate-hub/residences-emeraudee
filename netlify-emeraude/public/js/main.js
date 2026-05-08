/* ============================================================
   Les Résidences d'Émeraude — main.js v2.0
   Correction bug hero image + nouvelles fonctionnalités
   ============================================================ */

const API_URL = '/api';
let currentLightboxImages = [];
let currentLightboxIndex = 0;
let globalSettings = {};
let allRooms = [];
let galleryItems = [];

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type==='success'?'✓':'✕'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 4000);
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + (globalSettings.currency || 'FCFA');
}

// ─── SETTINGS + CORRECTION HERO IMAGE ───────────────────────
async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/settings`);
    globalSettings = await res.json();

    const logo = globalSettings.logo || 'https://cdn-icons-png.flaticon.com/512/3009/3009712.png';
    document.querySelectorAll('#site-logo').forEach(img => { if(img) img.src = logo; });

    if (globalSettings.hotel_name) {
      document.title = globalSettings.hotel_name;
      const navName = document.getElementById('nav-hotel-name');
      if (navName) navName.textContent = globalSettings.hotel_name;
    }

    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = globalSettings.hero_title || globalSettings.hotel_name || '';

    const heroSub = document.getElementById('hero-subtitle');
    if (heroSub) heroSub.textContent = globalSettings.hero_subtitle || globalSettings.hotel_tagline || '';

    // ══════════════════════════════════════════════════════
    // BUG FIX : L'image hero était codée en dur dans le CSS.
    // On la met à jour dynamiquement via style inline.
    // ══════════════════════════════════════════════════════
    if (globalSettings.hero_image) {
      const heroEl = document.getElementById('accueil');
      if (heroEl) {
        heroEl.style.backgroundImage =
          `linear-gradient(135deg,rgba(4,99,7,0.82) 0%,rgba(26,26,26,0.92) 100%),url('${globalSettings.hero_image}')`;
        heroEl.style.backgroundSize = 'cover';
        heroEl.style.backgroundPosition = 'center';
        heroEl.style.backgroundAttachment = window.innerWidth > 768 ? 'fixed' : 'scroll';
      }
    }

    const about = document.getElementById('about-description');
    if (about && globalSettings.hotel_description) about.textContent = globalSettings.hotel_description;
    const footerDesc = document.getElementById('footer-desc');
    if (footerDesc && globalSettings.hotel_description) footerDesc.textContent = globalSettings.hotel_description;

    const textFields = {
      'contact-address': globalSettings.address,
      'contact-phone1': globalSettings.phone1,
      'contact-phone2': globalSettings.phone2,
      'contact-email': globalSettings.email,
      'contact-checkin': globalSettings.checkin_time,
      'contact-checkout': globalSettings.checkout_time,
      'footer-address': globalSettings.address ? '📍 ' + globalSettings.address : null,
      'footer-phone': globalSettings.phone1 ? '📞 ' + globalSettings.phone1 : null,
      'footer-email': globalSettings.email ? '✉️ ' + globalSettings.email : null,
    };
    for (const [id, val] of Object.entries(textFields)) {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    }

    const linkFields = {
      'social-fb': globalSettings.facebook,
      'social-ig': globalSettings.instagram,
      'social-maps': globalSettings.google_maps,
      'maps-link': globalSettings.google_maps,
    };
    for (const [id, href] of Object.entries(linkFields)) {
      const el = document.getElementById(id);
      if (el && href) el.href = href;
    }

    if (globalSettings.whatsapp) {
      const wBtn = document.getElementById('whatsapp-btn');
      if (wBtn) wBtn.href = `https://wa.me/${globalSettings.whatsapp.replace(/\D/g,'')}`;
    }
  } catch (e) { console.error('Settings error', e); }
}

// ─── CHAMBRES ───────────────────────────────────────────────
async function loadRooms() {
  try {
    const res = await fetch(`${API_URL}/rooms`);
    allRooms = await res.json();
    const statEl = document.getElementById('stat-chambres');
    if (statEl) statEl.textContent = allRooms.length;
    renderRooms(allRooms);
    initRoomFilters();
  } catch (err) { console.error(err); }
}

function initRoomFilters() {
  document.querySelectorAll('.room-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      if (f === 'all') renderRooms(allRooms);
      else if (f === 'available') renderRooms(allRooms.filter(r => r.status === 'available'));
      else renderRooms(allRooms.filter(r => r.type === f));
    });
  });
}

function renderRooms(rooms) {
  const container = document.getElementById('rooms-grid');
  if (!container) return;
  if (!rooms.length) {
    container.innerHTML = '<p style="text-align:center;padding:3rem;color:#666;">Aucune chambre pour ce filtre.</p>';
    return;
  }
  container.innerHTML = rooms.map(room => {
    const images = room.images && room.images.length ? room.images : (room.image ? [room.image] : []);
    const available = room.status === 'available';
    return `
    <div class="room-card">
      <div class="room-gallery" id="gallery-${room.id}">
        ${images.map((img,i)=>`<img src="${img}" class="${i===0?'active':''}" onclick="openLightbox(${room.id},${i})" loading="lazy" alt="${room.name}">`).join('')}
        ${images.length>1?`
          <div class="gallery-counter">📷 ${images.length}</div>
          <div class="gallery-arrows">
            <button class="gallery-arrow" onclick="event.stopPropagation();changeGalleryImage(${room.id},-1)">‹</button>
            <button class="gallery-arrow" onclick="event.stopPropagation();changeGalleryImage(${room.id},1)">›</button>
          </div>
          <div class="gallery-nav">${images.map((_,i)=>`<button class="gallery-dot ${i===0?'active':''}" onclick="event.stopPropagation();setGalleryImage(${room.id},${i})"></button>`).join('')}</div>
        `:''}
        <div class="room-badge ${available?'badge-available':'badge-occupied'}">${available?'✓ Disponible':'✗ Occupée'}</div>
      </div>
      <div class="room-content">
        <span class="room-type-tag">${room.type}</span>
        <h3 class="room-name">${room.name}</h3>
        <p class="room-description">${room.description||''}</p>
        <div class="room-meta">
          <span>👥 ${room.capacity} pers.</span>
          <span class="room-price-inline">${formatPrice(room.price)}<small>/nuit</small></span>
        </div>
        <button class="btn btn-primary btn-reserve" onclick="${available?`openReservationModal(${room.id},'${room.name.replace(/'/g,"\\'")}',${room.price})`:''}" ${!available?'disabled':''}>
          ${available?'🗓️ Réserver maintenant':'Chambre indisponible'}
        </button>
      </div>
    </div>`;
  }).join('');
  // Re-init scroll reveal pour les nouvelles cartes
  document.querySelectorAll('.room-card').forEach(el => el.classList.add('reveal'));
  initScrollReveal();
}

function changeGalleryImage(roomId, dir) {
  const gallery = document.getElementById(`gallery-${roomId}`);
  if (!gallery) return;
  const imgs = gallery.querySelectorAll('img');
  const current = Array.from(imgs).findIndex(i => i.classList.contains('active'));
  setGalleryImage(roomId, (current+dir+imgs.length)%imgs.length);
}

function setGalleryImage(roomId, index) {
  const gallery = document.getElementById(`gallery-${roomId}`);
  if (!gallery) return;
  gallery.querySelectorAll('img').forEach((img,i) => img.classList.toggle('active', i===index));
  gallery.querySelectorAll('.gallery-dot').forEach((dot,i) => dot.classList.toggle('active', i===index));
}

// ─── LIGHTBOX ───────────────────────────────────────────────
function openLightbox(roomId, startIndex) {
  fetch(`${API_URL}/rooms/${roomId}`).then(r=>r.json()).then(room => {
    currentLightboxImages = room.images&&room.images.length ? room.images : [room.image];
    currentLightboxIndex = startIndex;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

function updateLightbox() {
  document.getElementById('lightbox-img').src = currentLightboxImages[currentLightboxIndex];
  document.getElementById('lightbox-counter').textContent = `${currentLightboxIndex+1} / ${currentLightboxImages.length}`;
}

function changeLightboxImage(dir) {
  currentLightboxIndex = (currentLightboxIndex+dir+currentLightboxImages.length)%currentLightboxImages.length;
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

// ─── SERVICES ───────────────────────────────────────────────
const SVC_ICONS = {'plane':'✈️','car':'🚗','map':'🗺️','shirt':'👔','baby':'👶','presentation':'📊','wifi':'📶','pool':'🏊','spa':'💆','gym':'💪','bar':'🍹','food':'🍽️'};

async function loadServices() {
  try {
    const items = await (await fetch(`${API_URL}/services`)).json();
    const c = document.getElementById('services-grid');
    if (!c) return;
    c.innerHTML = items.map(s=>`
      <div class="service-card reveal">
        <div class="service-icon">${SVC_ICONS[s.icon]||'✨'}</div>
        <h3>${s.name}</h3>
        <p>${s.description||''}</p>
        <div class="service-price">${s.price||'Sur devis'}</div>
      </div>`).join('');
  } catch(e){console.error(e);}
}

// ─── GALERIE ────────────────────────────────────────────────
async function loadGallery() {
  try {
    galleryItems = await (await fetch(`${API_URL}/gallery`)).json();
    renderGallery(galleryItems);
    initGalleryFilters();
  } catch(e){console.error(e);}
}

function initGalleryFilters() {
  const cats = [...new Set(galleryItems.map(i=>i.category).filter(Boolean))];
  const fc = document.getElementById('gallery-filters');
  if (!fc) return;
  fc.innerHTML = `<button class="gallery-filter-btn active" data-cat="all">Tout</button>`
    + cats.map(c=>`<button class="gallery-filter-btn" data-cat="${c}">${c}</button>`).join('');
  fc.querySelectorAll('.gallery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fc.querySelectorAll('.gallery-filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      renderGallery(cat==='all' ? galleryItems : galleryItems.filter(i=>i.category===cat));
    });
  });
}

function renderGallery(items) {
  const c = document.getElementById('gallery-grid');
  if (!c) return;
  c.innerHTML = items.map((item,idx)=>`
    <div class="gallery-item reveal" onclick="openGalleryLightbox(${idx})">
      <img src="${item.image}" alt="${item.title||''}" loading="lazy">
      <div class="gallery-overlay"><h4>${item.title||''}</h4><span>${item.category||''}</span></div>
    </div>`).join('');
  initScrollReveal();
}

function openGalleryLightbox(idx) {
  currentLightboxImages = galleryItems.map(i=>i.image);
  currentLightboxIndex = idx;
  updateLightbox();
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ─── AMENITÉS ───────────────────────────────────────────────
const AMN_ICONS = {'wifi':'📶','snowflake':'❄️','water':'🏊','car':'🚗','coffee':'☕','concierge-bell':'🛎️','tv':'📺','lock':'🔒','restaurant':'🍽️','gym':'💪','spa':'💆'};

async function loadAmenities() {
  try {
    const items = await (await fetch(`${API_URL}/amenities`)).json();
    const c = document.getElementById('amenities-grid');
    if (!c) return;
    c.innerHTML = items.map(a=>`
      <div class="amenity-card reveal">
        <div class="amenity-icon">${AMN_ICONS[a.icon]||'✨'}</div>
        <h3>${a.name}</h3>
        <p>${a.description||''}</p>
      </div>`).join('');
  } catch(e){console.error(e);}
}

// ─── TÉMOIGNAGES ────────────────────────────────────────────
async function loadTestimonials() {
  try {
    const items = await (await fetch(`${API_URL}/testimonials`)).json();
    const c = document.getElementById('testimonials-grid');
    if (!c) return;
    c.innerHTML = items.map(t=>`
      <div class="testimonial-card reveal">
        <div class="stars">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</div>
        <p class="testimonial-text">"${t.comment}"</p>
        <div class="testimonial-footer">
          <div class="testimonial-avatar">${t.client_name.charAt(0).toUpperCase()}</div>
          <div>
            <strong>${t.client_name}</strong>
            <div class="testimonial-date">${new Date(t.date).toLocaleDateString('fr-FR',{year:'numeric',month:'long'})}</div>
          </div>
        </div>
      </div>`).join('');
  } catch(e){console.error(e);}
}

// ─── RÉSERVATION ────────────────────────────────────────────
function openReservationModal(roomId, roomName, roomPrice) {
  document.getElementById('res-room-id').value = roomId;
  document.getElementById('res-room-name').textContent = roomName;
  document.getElementById('res-room-price').value = roomPrice;
  document.getElementById('res-price-display').textContent = formatPrice(roomPrice) + ' / nuit';
  document.getElementById('res-total').textContent = '–';
  document.getElementById('res-nights').textContent = '0';
  const today = new Date().toISOString().split('T')[0];
  ['res-checkin','res-checkout'].forEach(id => {
    const el = document.getElementById(id);
    el.min = today; el.value = '';
  });
  document.getElementById('reservation-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeReservationModal() {
  document.getElementById('reservation-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function calculateTotal() {
  const ci = document.getElementById('res-checkin').value;
  const co = document.getElementById('res-checkout').value;
  const price = parseFloat(document.getElementById('res-room-price').value)||0;
  if (ci && co) {
    const nights = Math.max(0,(new Date(co)-new Date(ci))/86400000);
    document.getElementById('res-total').textContent = nights>0 ? formatPrice(nights*price) : '–';
    document.getElementById('res-nights').textContent = nights;
    document.getElementById('res-checkout').min = ci;
  }
}

// ─── SCROLL REVEAL ──────────────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('active');obs.unobserve(e.target);} });
  }, {threshold:0.08});
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ─── NAVBAR ─────────────────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY>60));
}

// ─── COMPTEURS ANIMÉS ───────────────────────────────────────
function animateCounter(el, target) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const p = Math.min((ts-start)/1500,1);
    el.textContent = Math.floor(p*target);
    if(p<1) requestAnimationFrame(step); else el.textContent=target;
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        animateCounter(e.target, parseInt(e.target.dataset.count));
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.5});
  document.querySelectorAll('[data-count]').forEach(el=>obs.observe(el));
}

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { const l=document.getElementById('page-loader'); if(l) l.classList.add('hidden'); }, 900);

  loadSettings().then(() => {
    loadRooms(); loadServices(); loadGallery(); loadAmenities(); loadTestimonials();
    initCounters();
  });
  initScrollReveal();
  initNavbar();

  // Réservation submit
  const resForm = document.getElementById('reservation-form');
  if (resForm) {
    resForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = resForm.querySelector('[type="submit"]');
      btn.disabled=true; btn.textContent='⏳ Envoi...';
      try {
        const r = await fetch(`${API_URL}/reservations`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          client_name:document.getElementById('res-name').value,
          client_email:document.getElementById('res-email').value,
          phone:document.getElementById('res-phone').value,
          room_id:parseInt(document.getElementById('res-room-id').value),
          checkin_date:document.getElementById('res-checkin').value,
          checkout_date:document.getElementById('res-checkout').value,
        })});
        const data = await r.json();
        if(data.success){showToast('Réservation envoyée ! Total : '+formatPrice(data.total_price));closeReservationModal();resForm.reset();}
        else showToast(data.error||'Erreur','error');
      } catch{showToast('Erreur réseau','error');}
      finally{btn.disabled=false;btn.textContent='✓ Confirmer la réservation';}
    });
  }

  // Contact submit
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      btn.disabled=true;
      try {
        const r = await fetch(`${API_URL}/contacts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          name:document.getElementById('contact-name').value,
          email:document.getElementById('contact-email-input').value,
          subject:document.getElementById('contact-subject').value,
          message:document.getElementById('contact-message').value,
        })});
        if((await r.json()).success){showToast('Message envoyé !');contactForm.reset();}
        else showToast('Erreur','error');
      } catch{showToast('Erreur réseau','error');}
      finally{btn.disabled=false;btn.innerHTML='Envoyer le message →';}
    });
  }

  // Newsletter submit
  const newsForm = document.getElementById('newsletter-form');
  if (newsForm) {
    newsForm.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const r = await fetch(`${API_URL}/newsletter`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('newsletter-email').value})});
        if(r.ok){showToast('Inscription réussie !');newsForm.reset();}
        else{const err=await r.json();showToast(err.error||'Erreur','error');}
      } catch{showToast('Erreur réseau','error');}
    });
  }

  // Dates réservation
  ['res-checkin','res-checkout'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change',calculateTotal);
  });

  // Mobile menu
  const mobileMenu=document.getElementById('mobile-menu');
  const navLinks=document.getElementById('nav-links');
  if(mobileMenu&&navLinks){
    mobileMenu.addEventListener('click',()=>{
      navLinks.classList.toggle('open');
      mobileMenu.textContent=navLinks.classList.contains('open')?'✕':'☰';
    });
    navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navLinks.classList.remove('open');mobileMenu.textContent='☰';}));
  }

  // Fermer modals sur clic overlay
  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('active');document.body.style.overflow='';}});
  });

  // Lightbox clavier
  document.addEventListener('keydown',e=>{
    const lb=document.getElementById('lightbox');
    if(!lb||!lb.classList.contains('active')) return;
    if(e.key==='Escape') closeLightbox();
    if(e.key==='ArrowLeft') changeLightboxImage(-1);
    if(e.key==='ArrowRight') changeLightboxImage(1);
  });
});
