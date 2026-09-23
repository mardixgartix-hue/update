/**
 * MedVista Pharma — main.js
 * Single shared JS file for all pages.
 * No dependencies, no build tools.
 */

/* ==========================================
   UTIL HELPERS
   ========================================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ==========================================
   1. STICKY HEADER
   ========================================== */
function initStickyHeader() {
  const header = $('.site-header');
  if (!header) return;
  const threshold = 60;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > threshold);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==========================================
   2. MOBILE HAMBURGER MENU
   ========================================== */
function initMobileNav() {
  const hamburger = $('#hamburger-btn');
  const mobileNav = $('#mobile-nav');
  const overlay   = $('#mobile-overlay');
  const closeBtn  = $('#mobile-close');
  if (!hamburger || !mobileNav) return;

  function openNav() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
  }
  function closeNav() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.focus();
  }

  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    isOpen ? closeNav() : openNav();
  });
  closeBtn && closeBtn.addEventListener('click', closeNav);
  overlay && overlay.addEventListener('click', closeNav);

  // Keyboard: ESC closes nav
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeNav();
  });

  // Accordion for mobile dropdown
  $$('.mobile-nav-link[data-toggle]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.toggle;
      const panel = document.getElementById(targetId);
      if (!panel) return;
      const isOpen = panel.classList.contains('open');
      // Close others
      $$('.mobile-dropdown.open').forEach(p => {
        p.classList.remove('open');
        p.previousElementSibling && p.previousElementSibling.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        panel.classList.add('open');
        link.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================
   3. HERO SLIDER
   ========================================== */
function initHeroSlider() {
  const slider = $('.hero-slider');
  if (!slider) return;

  const track  = slider.querySelector('.hero-track');
  const slides = $$('.hero-slide', slider);
  const dots   = $$('.hero-dot', slider);
  const prev   = slider.querySelector('.hero-prev');
  const next   = slider.querySelector('.hero-next');
  if (!slides.length) return;

  let current   = 0;
  let timer     = null;
  let isPaused  = false;
  let startX    = 0;
  let isDragging = false;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current] && dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current] && dots[current].classList.add('active');
    track.style.transform = `translateX(-${current * 100}%)`;
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!isPaused) goTo(current + 1);
    }, 2200);
  }

  goTo(0);
  startAuto();

  prev && prev.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  next && next.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAuto(); }));

  slider.addEventListener('mouseenter', () => { isPaused = true; });
  slider.addEventListener('mouseleave', () => { isPaused = false; });

  // Touch/swipe support
  slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goTo(current + 1) : goTo(current - 1); startAuto(); }
    isDragging = false;
  });

  // Keyboard support
  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { goTo(current - 1); startAuto(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); startAuto(); }
  });
}

/* ==========================================
   4. SCROLL REVEAL (Intersection Observer)
   ========================================== */
function initScrollReveal() {
  const els = $$('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ==========================================
   5. FAQ ACCORDION
   ========================================== */
function initFaqAccordion() {
  const items = $$('.faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      items.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-answer').style.maxHeight = '';
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      // Open clicked if was closed
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================
   6. PRODUCT TABS
   ========================================== */
function initProductTabs() {
  const tabLists = $$('.tab-list');
  tabLists.forEach(list => {
    const tabBtns   = $$('.tab-btn', list);
    const tabPanels = $$('.tab-panel', list.parentElement);

    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        tabPanels[i] && tabPanels[i].classList.add('active');
      });
      // Keyboard nav
      btn.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { tabBtns[(i + 1) % tabBtns.length].click(); tabBtns[(i + 1) % tabBtns.length].focus(); }
        if (e.key === 'ArrowLeft')  { tabBtns[(i - 1 + tabBtns.length) % tabBtns.length].click(); tabBtns[(i - 1 + tabBtns.length) % tabBtns.length].focus(); }
      });
    });
  });
}

/* ==========================================
   7. THUMBNAIL GALLERY SWAP
   ========================================== */
function initGallerySwap() {
  const mainImg = $('#main-product-img');
  if (!mainImg) return;
  $$('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.thumb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mainImg.src = btn.dataset.src;
      mainImg.alt = btn.dataset.alt || '';
    });
  });
}

/* ==========================================
   8. QUICK VIEW MODAL
   ========================================== */
function initQuickViewModal() {
  const overlay = $('#quick-view-modal');
  if (!overlay) return;

  const closeBtn = overlay.querySelector('.modal-close');
  let lastFocused = null;

  function openModal(data) {
    lastFocused = document.activeElement;
    overlay.querySelector('#modal-product-name').textContent = data.name;
    overlay.querySelector('#modal-product-img').src = data.img;
    overlay.querySelector('#modal-product-img').alt = data.name;
    overlay.querySelector('#modal-composition').textContent = data.composition || '—';
    overlay.querySelector('#modal-pack').textContent       = data.pack || '—';
    overlay.querySelector('#modal-form-badge').textContent = data.form || '';
    overlay.querySelector('#modal-view-link').href = data.detailUrl || '#';

    // Set badge class
    const badge = overlay.querySelector('#modal-form-badge');
    badge.className = 'badge';
    if (data.form) {
      const cls = data.form === 'Tablet' ? 'badge-primary' : data.form === 'Syrup' ? 'badge-secondary' : 'badge-accent';
      badge.classList.add(cls);
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
    trapFocus(overlay);
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    lastFocused && lastFocused.focus();
  }

  closeBtn && closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  $$('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal({
      name:        btn.dataset.name,
      img:         btn.dataset.img,
      composition: btn.dataset.composition,
      pack:        btn.dataset.pack,
      form:        btn.dataset.form,
      detailUrl:   btn.dataset.detail,
    }));
  });

  // Expose for external use
  window.openQuickView = openModal;
}

function trapFocus(el) {
  const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  el.addEventListener('keydown', function handler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
    if (!el.classList.contains('open')) el.removeEventListener('keydown', handler);
  });
}

/* ==========================================
   9. LIVE SEARCH / FILTER
   ========================================== */
function initLiveSearch() {
  // Product overview page
  const overviewSearch = $('#products-overview-search');
  if (overviewSearch) {
    overviewSearch.addEventListener('input', () => {
      const q = overviewSearch.value.trim().toLowerCase();
      let visible = 0;
      $$('.category-card[data-name]').forEach(card => {
        const name = card.dataset.name.toLowerCase();
        const match = !q || name.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
    });
  }

  // Category pages
  const catSearch = $('#category-search');
  const countEl   = $('#products-count');
  if (catSearch) {
    catSearch.addEventListener('input', () => {
      const q = catSearch.value.trim().toLowerCase();
      let visible = 0;
      $$('.product-card[data-name]').forEach(card => {
        const name = card.dataset.name.toLowerCase();
        const match = !q || name.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (countEl) countEl.textContent = visible + ' product' + (visible !== 1 ? 's' : '');
    });
  }
}

/* ==========================================
   10. CONTACT FORM VALIDATION & SUBMISSION
   ========================================== */
function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  // Auto-fill subject from URL query param
  const params  = new URLSearchParams(window.location.search);
  const product = params.get('product');
  if (product) {
    const subjectField = form.querySelector('#subject');
    if (subjectField) subjectField.value = `Enquiry about: ${decodeURIComponent(product)}`;
  }

  const submitBtn  = form.querySelector('#submit-btn');
  const successMsg = form.querySelector('#form-success');

  const rules = {
    name:    { required: true, minLen: 2 },
    email:   { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone:   { required: false, pattern: /^[\d\s\-\+\(\)]{7,15}$/ },
    subject: { required: true, minLen: 2 },
    message: { required: true, minLen: 10 },
  };

  function getField(name) { return form.querySelector(`[name="${name}"]`); }
  function getError(name) { return form.querySelector(`#error-${name}`); }

  function validateField(name) {
    const field = getField(name);
    const err   = getError(name);
    if (!field || !err) return true;
    const val = field.value.trim();
    const rule = rules[name];
    let msg = '';

    if (rule.required && !val) msg = 'This field is required.';
    else if (val && rule.minLen && val.length < rule.minLen) msg = `Minimum ${rule.minLen} characters.`;
    else if (val && rule.pattern && !rule.pattern.test(val)) {
      msg = name === 'email' ? 'Please enter a valid email address.' : 'Please enter a valid phone number.';
    }

    if (msg) {
      field.classList.add('error');
      err.textContent = msg;
      err.classList.add('visible');
      return false;
    } else {
      field.classList.remove('error');
      err.classList.remove('visible');
      return true;
    }
  }

  // Inline validation on blur
  Object.keys(rules).forEach(name => {
    const field = getField(name);
    field && field.addEventListener('blur', () => validateField(name));
    field && field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(name);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const allValid = Object.keys(rules).map(validateField).every(Boolean);
    if (!allValid) return;

    // Gather form data
    const name    = getField('name').value.trim();
    const email   = getField('email').value.trim();
    const phone   = getField('phone') ? getField('phone').value.trim() : '';
    const subject = getField('subject').value.trim();
    const message = getField('message').value.trim();

    // Build WhatsApp message
    const waNumber = '917417350021'; // STENMED BIOTECH business number
    const waText = `*New Enquiry from Website*%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Name:* ${encodeURIComponent(name)}%0A` +
      `*Email:* ${encodeURIComponent(email)}%0A` +
      (phone ? `*Phone:* ${encodeURIComponent(phone)}%0A` : '') +
      `*Subject:* ${encodeURIComponent(subject)}%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Message:*%0A${encodeURIComponent(message)}`;

    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    // Show loading briefly then open WhatsApp
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      window.open(waUrl, '_blank');
      form.reset();
      successMsg && successMsg.classList.add('visible');
      showToast('Redirecting to WhatsApp… ✓', 'success');
      setTimeout(() => successMsg && successMsg.classList.remove('visible'), 6000);
    }, 600);
  });
}

/* ==========================================
   11. NEWSLETTER FORM
   ========================================== */
function initNewsletterForm() {
  $$('.newsletter-form').forEach(form => {
    const input   = form.querySelector('.newsletter-input');
    const btn     = form.querySelector('.newsletter-btn');
    const errEl   = form.querySelector('.newsletter-error');
    const succEl  = form.querySelector('.newsletter-success');
    if (!input || !btn) return;

    btn.addEventListener('click', async () => {
      const val = input.value.trim();
      if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errEl && (errEl.style.display = 'block');
        succEl && (succEl.style.display = 'none');
        errEl && (errEl.textContent = 'Please enter a valid email.');
        return;
      }
      errEl && (errEl.style.display = 'none');
      btn.disabled = true;
      btn.textContent = '...';
      await new Promise(r => setTimeout(r, 1000));
      btn.textContent = '✓';
      succEl && (succEl.style.display = 'block');
      succEl && (succEl.textContent = 'Subscribed! Thank you.');
      input.value = '';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Subscribe';
        succEl && (succEl.style.display = 'none');
      }, 4000);
    });
  });
}

/* ==========================================
   12. BACK TO TOP BUTTON
   ========================================== */
function initBackToTop() {
  const btn = $('#back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ==========================================
   13. AUTO YEAR COPYRIGHT
   ========================================== */
function initYear() {
  $$('.auto-year').forEach(el => { el.textContent = new Date().getFullYear(); });
}

/* ==========================================
   14. TOAST NOTIFICATIONS
   ========================================== */
function showToast(msg, type = '') {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  // Force reflow
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}
window.showToast = showToast;

/* ==========================================
   15. PRODUCT ENQUIRE BUTTON (detail page)
   ========================================== */
function initEnquireBtn() {
  const btn = $('#enquire-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const name    = btn.dataset.product || '';
    const pageUrl = `${window.location.origin}/contact.html?product=${encodeURIComponent(name)}`;
    window.location.href = pageUrl;
  });
}

/* ==========================================
   16. LOAD MORE PRODUCTS (category pages)
   ========================================== */
function initLoadMore() {
  const btn      = $('#load-more-btn');
  if (!btn) return;
  const grid     = $('.products-grid');
  const hidden   = $$('.product-card.hidden-card', grid);
  const pageSize = 9;
  let shown      = 0;

  function showMore() {
    const batch = hidden.slice(shown, shown + pageSize);
    batch.forEach(card => { card.classList.remove('hidden-card'); card.style.display = ''; });
    shown += batch.length;
    if (shown >= hidden.length) btn.style.display = 'none';
  }
  showMore();
  btn.addEventListener('click', showMore);
}

/* ==========================================
   17. ACTIVE NAV LINK HIGHLIGHT
   ========================================== */
function initActiveNav() {
  const path = window.location.pathname;
  $$('.nav-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Normalize
    const linkPath = href.replace(/\\/g, '/');
    if (
      (path.endsWith(linkPath) && linkPath !== '/' && linkPath !== '/index.html') ||
      (linkPath === 'index.html' && (path === '/' || path.endsWith('/index.html'))) ||
      (linkPath.includes('products.html') && path.includes('products.html') && !path.includes('/products/'))
    ) {
      link.classList.add('active');
    }
  });
}

/* ==========================================
   INIT ALL
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNav();
  initHeroSlider();
  initScrollReveal();
  initFaqAccordion();
  initProductTabs();
  initGallerySwap();
  initQuickViewModal();
  initLiveSearch();
  initContactForm();
  initNewsletterForm();
  initBackToTop();
  initYear();
  initEnquireBtn();
  initLoadMore();
  initActiveNav();
});

window.addEventListener('siteDataLoaded', () => {
  initLiveSearch();
});
