/**
 * STENMED BIOTECH — Dynamic Site Data Loader
 * Fetches /data/site-data.json and hydrates all website pages in real time.
 */

(function () {
  'use strict';

  // Determine relative/absolute path to data/site-data.json based on current page
  function getDataPath() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    
    // Check if running on local file system or http
    if (window.location.protocol === 'file:') {
      if (pathname.includes('/products/') || pathname.includes('/product/') || pathname.includes('/admin/')) {
        return '../data/site-data.json';
      }
      return 'data/site-data.json';
    }
    
    return '/data/site-data.json?v=' + Date.now();
  }

  async function loadSiteData() {
    try {
      const response = await fetch(getDataPath());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      window.SITE_DATA = data;
      hydratePage(data);
      window.dispatchEvent(new CustomEvent('siteDataLoaded', { detail: data }));
    } catch (err) {
      console.warn('[SiteData] Could not load dynamic site-data.json, keeping default HTML content.', err);
    }
  }

  function hydratePage(data) {
    if (!data) return;

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
        // If element only contains phone icon + text, update the text node
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
      const statNums = document.querySelectorAll('.stat-number, .stat-num');
      data.stats.forEach((st, idx) => {
        if (statNums[idx]) {
          statNums[idx].textContent = st.num;
        }
      });
    }

    // 3. Category Products Page Hydration
    hydrateCategoryOrProductsPage(data);
  }

  function hydrateCategoryOrProductsPage(data) {
    const grid = document.getElementById('products-grid');
    if (!grid || !data.products) return;

    const pathname = window.location.pathname;
    let currentCategory = null;

    if (pathname.includes('/pediatrics.html')) currentCategory = 'pediatrics';
    else if (pathname.includes('/gynecologist.html')) currentCategory = 'gynecologist';
    else if (pathname.includes('/gastro.html')) currentCategory = 'gastro';
    else if (pathname.includes('/physician.html')) currentCategory = 'physician';

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
            <img src="${product.image}" alt="${product.name}" style="width:100%;height:100%;object-fit:contain;padding:12px;background:#fff;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
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
        <article class="product-card" data-name="${product.name}">
          ${imgHtml}
          <div class="product-card-body">
            <span class="badge badge-rx product-card-form">Rx — ${cat.name}</span>
            <h2 class="product-card-name">${product.name}</h2>
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
              <a href="/contact.html?product=${encodeURIComponent(product.name)}" class="btn btn-primary btn-sm product-inquire-btn" data-product="${product.name}">
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
