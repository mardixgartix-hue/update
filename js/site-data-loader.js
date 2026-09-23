/**
 * STENMED BIOTECH — Dynamic Site Data Loader
 * Fetches /site-data.json and hydrates all website pages in real time.
 */

(function () {
  'use strict';

  // Determine relative/absolute path to the root site-data.json based on current page
  function getDataPath() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    
    // Check if running on local file system or http
    if (window.location.protocol === 'file:') {
      if (pathname.includes('/products/') || pathname.includes('/product/') || pathname.includes('/admin/')) {
        return '../site-data.json';
      }
      return 'site-data.json';
    }
    
    return '/site-data.json?v=' + Date.now();
  }

  async function loadSiteData() {
    let data = null;
    try {
      const response = await fetch(getDataPath(), { cache: 'no-store' });
      if (response.ok) {
        data = await response.json();
      }
    } catch (err) {
      console.warn('[SiteData] Could not load dynamic site-data.json', err);
    }

    const localCache = localStorage.getItem('stenmed_live_json');
    if (localCache) {
      try {
        const cached = JSON.parse(localCache);
        if (cached && cached.lastUpdated) {
          if (!data || (cached.lastUpdated > (data.lastUpdated || ''))) {
            data = cached;
          }
        }
      } catch (e) {}
    }

    if (data) {
      window.SITE_DATA = data;
      hydratePage(data);
      window.dispatchEvent(new CustomEvent('siteDataLoaded', { detail: data }));
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function hydratePage(data) {
    if (!data) return;

    hydrateSeo(data);
    hydrateProductDetail(data);

    // 1. Company Info
    if (data.company) {
      const c = data.company;

      // Text elements with data-site
      document.querySelectorAll('[data-site="company-name"]').forEach(el => el.textContent = c.name);
      document.querySelectorAll('[data-site="phone"]').forEach(el => el.textContent = c.phone);
      document.querySelectorAll('[data-site="whatsapp"]').forEach(el => el.textContent = c.whatsapp);
      document.querySelectorAll('[data-site="email"]').forEach(el => el.textContent = c.email);
      document.querySelectorAll('[data-site="address"]').forEach(el => el.textContent = c.address);
      document.querySelectorAll('[data-site="workingHours"]').forEach(el => el.textContent = c.workingHours);
      document.querySelectorAll('[data-site="gstin"]').forEach(el => el.textContent = c.gstin);
      document.querySelectorAll('[data-site="dlNumber"]').forEach(el => el.textContent = c.dlNumber);

      // Top bar and general links
      document.querySelectorAll('a[href^="tel:"]').forEach(el => {
        el.href = `tel:${c.phoneRaw || c.phone.replace(/[^0-9+]/g, '')}`;
        const icon = el.querySelector('i');
        if (icon) {
          el.innerHTML = `${icon.outerHTML} ${c.phone}`;
        }
      });

      document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
        el.href = `mailto:${c.email}`;
        const icon = el.querySelector('i');
        if (icon) {
          el.innerHTML = `${icon.outerHTML} ${c.email}`;
        }
      });

      if (data.assets?.logo) {
        document.querySelectorAll('.site-logo img, .sidebar-brand img').forEach(img => {
          img.src = data.assets.logo;
        });
      }

      const socialLinks = c.social || {};
      Object.entries(socialLinks).forEach(([network, href]) => {
        if (!/^https:\/\//i.test(href)) return;
        document.querySelectorAll(`.social-icons a[href*="${network}"]`).forEach(link => {
          link.href = href;
        });
      });

      document.querySelectorAll('.footer-desc').forEach(el => {
        if (c.description) el.textContent = c.description;
      });

      // WhatsApp links
      document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
        const num = c.whatsappNumber || c.whatsapp.replace(/[^0-9]/g, '');
        const currentHref = el.getAttribute('href') || '';
        const hasText = currentHref.includes('text=');
        let textQuery = '';
        if (hasText) {
          const match = currentHref.match(/text=([^&]+)/);
          if (match) textQuery = `?text=${match[1]}`;
        }
        el.href = `https://wa.me/${num}${textQuery}`;
      });

      // Update footer address texts if present
      document.querySelectorAll('.footer-contact-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes('kasna') || text.includes('goida') || text.includes('noida') || text.includes('u.p')) {
          const icon = item.querySelector('i');
          if (icon) {
            item.innerHTML = `${icon.outerHTML} <span>${c.address}</span>`;
          }
        }
      });
    }

    // 2. Stats
    if (data.stats && Array.isArray(data.stats)) {
      const statNodes = document.querySelectorAll('.stat-item');
      statNodes.forEach((node, idx) => {
        const st = data.stats[idx];
        if (!st) return;
        const numEl = node.querySelector('.stat-number, .stat-num');
        const labelEl = node.querySelector('.stat-label');
        if (numEl) numEl.textContent = st.num || '';
        if (labelEl) labelEl.textContent = st.label || '';
      });

      const statNums = document.querySelectorAll('.stat-number, .stat-num');
      data.stats.forEach((st, idx) => {
        if (statNums[idx]) {
          statNums[idx].textContent = st.num;
        }
      });
    }

    // 3. Homepage / About content hydration
    hydrateSiteContent(data);

    // 4. Category Products Page Hydration
    hydrateCategoryOrProductsPage(data);
  }

  function hydrateSeo(data) {
    const seo = data.seo || {};
    const key = window.location.pathname.split('/').pop() || 'index.html';
    const page = seo.pages?.[key] || {};
    const title = page.title || seo.defaultTitle || data.company?.name;
    const description = page.description || seo.defaultDescription || data.company?.description;
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && seo.siteUrl) {
      canonical.href = `${seo.siteUrl.replace(/\/$/, '')}${window.location.pathname}`;
    }
  }

  function hydrateProductDetail(data) {
    const match = window.location.pathname.match(/\/product\/([^/]+)\.html$/);
    if (!match) return;
    const product = (data.products || []).find(item => (item.detailSlug || item.id) === match[1]);
    if (!product) return;
    const info = document.querySelector('.product-info-panel');
    if (!info) return;
    const title = info.querySelector('h2');
    const subtitle = info.querySelector('h2 + p');
    const details = info.querySelector('[style*="grid-template-columns"]');
    const description = details?.parentElement?.nextElementSibling;
    if (title) title.textContent = product.name || '';
    if (subtitle) subtitle.textContent = product.composition || '';
    if (details) {
      details.innerHTML = `
        <div><strong>Composition:</strong> ${escapeHtml(product.composition || '')}</div>
        <div><strong>Form:</strong> ${escapeHtml(product.form || '')}</div>
        <div><strong>Packaging:</strong> ${escapeHtml(product.packaging || '')}</div>
        <div><strong>Therapeutic:</strong> ${escapeHtml(product.use || '')}</div>
        <div><strong>Quality Standard:</strong> WHO-GMP Certified</div>`;
    }
    if (description) description.textContent = product.description || '';
    document.querySelectorAll('a[href*="contact.html?product="]').forEach(link => {
      link.href = `/contact.html?product=${encodeURIComponent(product.name)}`;
    });
  }

  function hydrateSiteContent(data) {
    if (!data) return;

    if (data.heroSlides && document.querySelectorAll('.hero-slide').length) {
      const slides = document.querySelectorAll('.hero-slide');
      slides.forEach((slide, index) => {
        const item = data.heroSlides[index] || data.heroSlides[0];
        const bg = slide.querySelector('.hero-slide-bg');
        if (bg) {
          const image = item.image || '/assets/images/hero/hero-01.jpg';
          bg.style.backgroundImage = `url('${image}')`;
        }

        const eyebrow = slide.querySelector('.hero-slide-eyebrow');
        if (eyebrow) {
          eyebrow.innerHTML = `<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> ${escapeHtml(item.highlight || 'Healthcare Excellence')}`;
        }

        const titleEl = slide.querySelector('.hero-slide-title');
        if (titleEl) titleEl.textContent = item.title || '';

        const subEl = slide.querySelector('.hero-slide-sub');
        if (subEl) subEl.textContent = item.subtitle || '';

        const ctaWrap = slide.querySelector('.hero-slide-ctas');
        if (ctaWrap) {
          const pText = item.primaryBtnText || 'Explore Products';
          const pLink = item.primaryBtnLink || '/products.html';
          const sText = item.secondaryBtnText || 'Get a Quote';
          const sLink = item.secondaryBtnLink || '/contact.html';
          ctaWrap.innerHTML = `
            <a href="${pLink}" class="btn btn-accent btn-lg"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> ${escapeHtml(pText)}</a>
            <a href="${sLink}" class="btn btn-white btn-lg"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> ${escapeHtml(sText)}</a>
          `;
        }
      });
    }

    if (data.categories && document.querySelectorAll('#categories .category-card').length) {
      const cards = document.querySelectorAll('#categories .category-card');
      cards.forEach((card, index) => {
        const item = data.categories[index] || data.categories[0];
        const nameEl = card.querySelector('.category-card-name');
        if (nameEl) {
          nameEl.innerHTML = `<i class="fa-solid ${item.icon || 'fa-pills'} fa-fw" aria-hidden="true" style="color:${item.color || '#0ea5e9'}"></i> ${escapeHtml(item.name || '')}`;
        }

        const descEl = card.querySelector('.category-card-desc');
        if (descEl) descEl.textContent = item.desc || '';

        const linkEl = card.querySelector('.card-arrow-link');
        if (linkEl) {
          linkEl.href = item.page || '/products.html';
          linkEl.innerHTML = `View Products <i class="fa-solid fa-arrow-right"></i>`;
        }

        const imgWrap = card.querySelector('.category-card-img');
        if (imgWrap && item.color) {
          const gradient = `linear-gradient(135deg, ${item.color}, ${item.color}aa)`;
          imgWrap.style.background = gradient;
        }
      });
    }

    if (data.whyChooseUs && document.querySelectorAll('#why-us .why-card').length) {
      const cards = document.querySelectorAll('#why-us .why-card');
      cards.forEach((card, index) => {
        const item = data.whyChooseUs[index] || data.whyChooseUs[0];
        const iconEl = card.querySelector('.why-icon i');
        if (iconEl) {
          iconEl.className = `fa-solid ${item.icon || 'fa-star'}`;
        }
        const titleEl = card.querySelector('.why-title');
        if (titleEl) titleEl.textContent = item.title || '';
        const descEl = card.querySelector('.why-desc');
        if (descEl) descEl.textContent = item.desc || '';
      });
    }

    if (data.about && document.querySelector('.about-summary .about-content')) {
      const content = document.querySelector('.about-summary .about-content');
      const titleEl = content.querySelector('.section-title');
      if (titleEl) titleEl.textContent = data.about.headline || 'Committed to Accessible & Affordable Healthcare';

      const ps = content.querySelectorAll('p');
      if (ps[0]) ps[0].textContent = data.about.story || data.company.description || '';
      if (ps[1] && data.about.subheadline) ps[1].textContent = data.about.subheadline;
    }

    if (data.about) {
      const aboutSections = document.querySelectorAll('.alt-section-content');
      if (aboutSections[0]) {
        const visionTitle = aboutSections[0].querySelector('.section-title');
        const visionText = aboutSections[0].querySelector('p');
        if (visionTitle && data.about.visionTitle) visionTitle.textContent = data.about.visionTitle;
        if (visionText && data.about.vision) visionText.textContent = data.about.vision;
      }
      if (aboutSections[1]) {
        const missionTitle = aboutSections[1].querySelector('.section-title');
        const missionText = aboutSections[1].querySelector('p');
        if (missionTitle && data.about.missionTitle) missionTitle.textContent = data.about.missionTitle;
        if (missionText && data.about.mission) missionText.textContent = data.about.mission;
      }
    }

    if (data.about && document.querySelector('.page-banner-title')) {
      const banner = document.querySelector('.page-banner-title');
      if (banner) banner.textContent = `About ${data.company?.name || 'STENMED BIOTECH'}`;
    }

    if (data.wellnessTips && document.querySelector('.tips-grid')) {
      const tipsGrid = document.querySelector('.tips-grid');
      tipsGrid.innerHTML = (data.wellnessTips || []).map((tip, idx) => `
        <div class="tip-item reveal reveal-delay-${(idx % 4) + 1}">
          <div class="tip-icon"><i class="fa-solid ${tip.icon || 'fa-heart'}" style="color:var(--color-primary)" aria-hidden="true"></i></div>
          <div class="tip-label">${escapeHtml(tip.label || '')}</div>
        </div>
      `).join('');
    }

    if (data.categories && document.querySelector('#categories .categories-grid, #categories-grid')) {
      const categoriesGrid = document.querySelector('#categories .categories-grid, #categories-grid');
      categoriesGrid.innerHTML = (data.categories || []).map((cat, idx) => `
        <article class="category-card reveal ${idx > 1 ? 'reveal-delay-2' : idx === 1 ? 'reveal-delay-1' : ''}" data-name="${escapeHtml(cat.name || '')}">
          <div class="category-card-img" style="background:linear-gradient(135deg, ${cat.color || '#0284c7'}, ${cat.color || '#0ea5e9'});display:flex;align-items:center;justify-content:center;min-height:160px;">
            <i class="fa-solid ${cat.icon || 'fa-pills'}" style="font-size:64px;color:#fff;opacity:.9" aria-hidden="true"></i>
          </div>
          <div class="category-card-body">
            <h3 class="category-card-name"><i class="fa-solid ${cat.icon || 'fa-pills'} fa-fw" aria-hidden="true" style="color:${cat.color || '#0284c7'}"></i> ${escapeHtml(cat.name || '')}</h3>
            <p class="category-card-desc">${escapeHtml(cat.desc || '')}</p>
            <a href="${escapeHtml(cat.page || '/products.html')}" class="card-arrow-link">View Products <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </article>
      `).join('');
    }

    if (data.categories && document.querySelector('#products-grid')) {
      const category = data.categories.find(item => item.id === getCurrentCategory());
      const title = document.querySelector('.page-banner-title');
      const description = document.querySelector('.section-desc');
      if (category) {
        if (title) title.textContent = category.name || title.textContent;
        if (description && category.desc) description.textContent = category.desc;
      }
    }

    if (data.brands && document.querySelector('.brands-track')) {
      const brandTrack = document.querySelector('.brands-track');
      const repeated = [...(data.brands || []), ...(data.brands || [])];
      brandTrack.innerHTML = repeated.map((brand) => `
        <div class="brand-logo" style="display:flex;align-items:center;gap:.5rem;font-family:var(--font-heading);font-weight:800;font-size:1.1rem;color:var(--color-text);padding:0 1rem">
          <i class="fa-solid ${brand.icon || 'fa-star'}" style="color:${brand.color || '#0ea5e9'};font-size:1.4rem"></i> ${escapeHtml(brand.name || '')}
        </div>
      `).join('');
    }

    if (data.testimonials && document.querySelector('.testimonials-grid')) {
      const testimonialsGrid = document.querySelector('.testimonials-grid');
      testimonialsGrid.innerHTML = (data.testimonials || []).map((item, idx) => `
        <div class="testimonial-card reveal reveal-delay-${idx + 1}">
          <div class="testimonial-stars" aria-label="5 stars">★★★★★</div>
          <p class="testimonial-quote">"${escapeHtml(item.quote || '')}"</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar">${escapeHtml(item.avatar || 'ST')}</div>
            <div>
              <div class="author-name">${escapeHtml(item.name || '')}</div>
              <div class="author-title">${escapeHtml(item.title || '')}</div>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (data.cta && document.querySelector('.cta-banner')) {
      const cta = document.querySelector('.cta-banner');
      const label = cta.querySelector('.section-label');
      const h2 = cta.querySelector('h2');
      const p = cta.querySelector('p');
      const primary = cta.querySelector('.cta-banner-btns a.btn.btn-accent');
      const secondary = cta.querySelector('.cta-banner-btns a.btn.btn-white');
      if (label) label.innerHTML = `<i class="fa-solid fa-handshake" aria-hidden="true"></i> ${escapeHtml(data.cta.eyebrow || 'Ready to Partner?')}`;
      if (h2) h2.textContent = data.cta.title || '';
      if (p) p.textContent = data.cta.description || '';
      if (primary) {
        primary.href = data.cta.primaryBtnLink || '/contact.html';
        primary.innerHTML = `<i class="fa-solid fa-file-invoice" aria-hidden="true"></i> ${escapeHtml(data.cta.primaryBtnText || 'Request a Quote')}`;
      }
      if (secondary) {
        secondary.href = data.cta.secondaryBtnLink || 'tel:+917417350021';
        secondary.innerHTML = `<i class="fa-solid fa-phone" aria-hidden="true"></i> ${escapeHtml(data.cta.secondaryBtnText || 'Call Us Now')}`;
      }
    }

    if (data.privacyNote) {
      const privacyNode = document.querySelector('#contact-privacy-note, .form-note');
      if (privacyNode) privacyNode.textContent = data.privacyNote;
    }

    if (data.faqs && document.querySelector('#faq .faq-list')) {
      const faqList = document.querySelector('#faq .faq-list');
      faqList.innerHTML = (data.faqs || []).map((faq, idx) => `
        <div class="faq-item" role="listitem">
          <button class="faq-question" aria-expanded="false" id="faq-q${idx + 1}" aria-controls="faq-a${idx + 1}">
            ${escapeHtml(faq.q || '')}
            <span class="faq-icon" aria-hidden="true">+</span>
          </button>
          <div class="faq-answer" id="faq-a${idx + 1}" role="region" aria-labelledby="faq-q${idx + 1}">
            <div class="faq-answer-inner">${escapeHtml(faq.a || '')}</div>
          </div>
        </div>
      `).join('');
      if (typeof initFaqAccordion === 'function') {
        initFaqAccordion();
      }
    }
  }

  function hydrateCategoryOrProductsPage(data) {
    const grid = document.getElementById('products-grid');
    if (!grid || !data.products) return;

    const pathname = window.location.pathname;
    let currentCategory = null;

    currentCategory = getCurrentCategory();

    // If on a specific category page, filter products
    let productsToRender = data.products;
    if (currentCategory) {
      productsToRender = data.products.filter(p => p.category === currentCategory);
      
      // Update count badge
      const countEl = document.getElementById('products-count');
      if (countEl) {
        countEl.textContent = `${productsToRender.length} product${productsToRender.length === 1 ? '' : 's'}`;
      }
    }

    // Only dynamically re-render if flagged or if custom products exist
    if (grid.dataset.dynamicHydrate === 'true' || currentCategory) {
      renderProductCards(grid, productsToRender, data.categories);
    }
  }

  function getCurrentCategory() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/products\/([^/]+)\.html$/);
    return match ? match[1] : null;
  }

  function renderProductCards(container, products, categories) {
    if (!products || !products.length) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--color-text-muted, #64748b);">
          <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 0.8rem; display: block; opacity: 0.5;"></i>
          <p>No products available in this category.</p>
        </div>`;
      return;
    }

    const catMap = {};
    (categories || []).forEach(c => { catMap[c.id] = c; });

    let html = '';
    products.forEach(product => {
      const cat = catMap[product.category] || { name: product.category || 'General' };
      let imgHtml;
      if (product.image && product.image.trim()) {
        imgHtml = `
          <div class="product-img-wrap" style="background:#fff;border-bottom:1px solid var(--color-border,#e2e8f0);display:flex;align-items:center;justify-content:center;height:220px;overflow:hidden;">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width:100%;height:100%;object-fit:contain;padding:12px;background:#fff;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div style="display:none;align-items:center;justify-content:center;height:220px;width:100%;background:#f8fafc;">
              <i class="fa-solid fa-pills" style="font-size:48px;color:#cbd5e1"></i>
            </div>
          </div>`;
      } else {
        imgHtml = `
          <div class="product-img-wrap" style="background:#fff;border-bottom:1px solid var(--color-border,#e2e8f0);display:flex;align-items:center;justify-content:center;height:220px;">
            <i class="fa-solid fa-pills" style="font-size:48px;color:#cbd5e1"></i>
          </div>`;
      }

      html += `
        <article class="product-card" data-name="${escapeHtml(product.name)}">
          ${imgHtml}
          <div class="product-card-body">
            <span class="badge badge-rx product-card-form">Rx — ${cat.name}</span>
            <h2 class="product-card-name">${escapeHtml(product.name)}</h2>
            ${product.composition ? `
            <div class="product-composition">
              <i class="fa-solid fa-flask-vial fa-fw" aria-hidden="true"></i>
              <span><strong>Composition:</strong> ${product.composition}</span>
            </div>` : ''}
            ${product.use ? `
            <div class="product-uses">
              <i class="fa-solid fa-kit-medical fa-fw" aria-hidden="true"></i>
              <span><strong>Indication:</strong> ${product.use}</span>
            </div>` : ''}
            <div class="product-card-footer">
              <a href="/contact.html?product=${encodeURIComponent(product.name)}" class="btn btn-primary btn-sm product-inquire-btn" data-product="${escapeHtml(product.name)}">
                <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Inquire Now
              </a>
            </div>
          </div>
        </article>`;
    });

    container.innerHTML = html;
  }

  // Execute on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteData);
  } else {
    loadSiteData();
  }
})();
