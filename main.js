/* ==========================================================================
   PASÁŽ VELVET - INTERACTIVE LOGIC & ANIMATIONS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. Page Loader ---
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('loaded');
      }, 600); // Small delay for visual aesthetic satisfaction
    }
  });

  // Backup loader hide in case load event already fired or delayed
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('loaded')) {
      loader.classList.add('loaded');
    }
  }, 3000);

  // --- 2. Sticky Header and Scroll Tracking ---
  const header = document.querySelector('.header');
  const navItems = document.querySelectorAll('.nav-item');

  // Sledujeme jen sekce, na které navigace opravdu vede. Uvnitř jídelních
  // lístků jsou další <section> pro kotvy kategorií – ty jsou ve skrytých
  // tabech, takže mají offsetTop 0 a dřív přepisovaly zvýrazněnou položku.
  const navTargets = [...navItems]
    .map(item => document.getElementById(item.getAttribute('href').slice(1)))
    .filter(Boolean);

  function updateActiveNavItem() {
    // Sekce jsou v pořadí navigace, takže vyhraje poslední, jejíž začátek
    // už vyjel nad horní hranu (pod fixní hlavičkou).
    let current = '';
    navTargets.forEach(section => {
      if (section.getBoundingClientRect().top <= 140) {
        current = section.id;
      }
    });

    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('href').slice(1) === current);
    });
  }

  window.addEventListener('scroll', () => {
    // Toggle sticky class
    if (window.scrollY > 50) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }

    updateActiveNavItem();
  });

  updateActiveNavItem();

  // --- 3. Mobile Navigation Menu Toggle ---
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-list a');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
      
      // Prevent body scrolling when mobile menu is open
      if (navMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Close menu when clicking link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // --- 4. Menu Tabs Switcher ---
  const tabButtons = document.querySelectorAll('.menu-tab-btn');
  const menuPanels = document.querySelectorAll('#menu > .container > .menu-grid');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
      });
      menuPanels.forEach((panel) => panel.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const target = btn.getAttribute('data-target');
      document.getElementById(`menu-${target}`)?.classList.add('active');
    });
  });

  // --- 6. Gallery Lightbox Modal ---
  // Galerie je seskupená po pokrmech: jedna dlaždice = jeden pokrm, kliknutím
  // se otevře lightbox se všemi jeho fotkami a dá se mezi nimi listovat.
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxStrip = document.getElementById('lightbox-strip');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  // Náhled ke stejné fotce – liší se jen adresářem.
  const thumbOf = (src) => (src.includes('/full/') ? src.replace('/full/', '/thumb/') : src);

  let activePhotos = [];
  let activeTitle = '';
  let activeIndex = 0;
  let lastFocused = null;

  function renderStrip() {
    if (!lightboxStrip) return;
    // U jediné fotky nemá pás náhledů co ukazovat.
    lightboxStrip.innerHTML =
      activePhotos.length < 2
        ? ''
        : activePhotos
            .map(
              (src, i) =>
                `<button type="button" class="lightbox-thumb${i === activeIndex ? ' active' : ''}" data-index="${i}" aria-label="Fotografie ${i + 1}"><img src="${thumbOf(src)}" alt="" loading="lazy" /></button>`
            )
            .join('');
  }

  function showPhoto(index) {
    if (!activePhotos.length) return;
    // Listování dokola – z poslední fotky se dostaneme zpátky na první.
    activeIndex = (index + activePhotos.length) % activePhotos.length;

    lightboxImg.src = activePhotos[activeIndex];
    lightboxImg.alt = `${activeTitle} – fotografie ${activeIndex + 1} z ${activePhotos.length}`;
    if (lightboxCaption) lightboxCaption.textContent = activeTitle;
    if (lightboxCounter) {
      lightboxCounter.textContent =
        activePhotos.length > 1 ? `${activeIndex + 1} / ${activePhotos.length}` : '';
    }

    const multiple = activePhotos.length > 1;
    if (lightboxPrev) lightboxPrev.hidden = !multiple;
    if (lightboxNext) lightboxNext.hidden = !multiple;

    renderStrip();
    lightboxStrip?.querySelector('.lightbox-thumb.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });

    // Sousední fotky napřed, ať listování nebliká.
    if (multiple) {
      [activeIndex + 1, activeIndex - 1].forEach((i) => {
        const preload = new Image();
        preload.src = activePhotos[(i + activePhotos.length) % activePhotos.length];
      });
    }
  }

  function openGallery(photos, title, trigger) {
    if (!lightbox || !lightboxImg || !photos.length) return;
    activePhotos = photos;
    activeTitle = title;
    lastFocused = trigger || null;
    showPhoto(0);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    lightboxClose?.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lastFocused?.focus();
    lastFocused = null;
    setTimeout(() => {
      lightboxImg.src = '';
      lightboxImg.alt = '';
      if (lightboxCaption) lightboxCaption.textContent = '';
      if (lightboxCounter) lightboxCounter.textContent = '';
      if (lightboxStrip) lightboxStrip.innerHTML = '';
    }, 400);
  }

  // Dlaždice se překreslují i z JSON, proto posloucháme na mřížce.
  function bindGalleryGrid() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid || grid.dataset.bound === 'true') return;
    grid.dataset.bound = 'true';

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery-item');
      if (!item || !grid.contains(item)) return;

      // data-photos = seskupený pokrm, data-image = starší jednotlivá fotka.
      const photos = (item.dataset.photos || item.dataset.image || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const title = item.dataset.title || item.querySelector('img')?.alt || '';

      openGallery(photos, title, item);
    });
  }

  bindGalleryGrid();

  if (lightbox && lightboxImg) {
    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => showPhoto(activeIndex - 1));
    lightboxNext?.addEventListener('click', () => showPhoto(activeIndex + 1));

    lightboxStrip?.addEventListener('click', (e) => {
      const thumb = e.target.closest('.lightbox-thumb');
      if (thumb) showPhoto(Number(thumb.dataset.index));
    });

    // Zavření kliknutím mimo fotku (ne na ovládací prvky).
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showPhoto(activeIndex - 1);
      else if (e.key === 'ArrowRight') showPhoto(activeIndex + 1);
    });

    // Listování prstem na mobilu.
    let touchStartX = 0;
    lightbox.addEventListener(
      'touchstart',
      (e) => { touchStartX = e.changedTouches[0].screenX; },
      { passive: true }
    );
    lightbox.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) > 50) showPhoto(activeIndex + (dx < 0 ? 1 : -1));
      },
      { passive: true }
    );
  }

  // --- 7. Reveal on Scroll Animation ---
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          // Once animated, stop tracking it
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null, // viewport
      threshold: 0.15, // trigger when 15% visible
      rootMargin: '0px 0px -50px 0px' // adjust bottom trigger point
    });

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
  } else {
    // Fallback if IntersectionObserver not supported (reveal everything instantly)
    revealElements.forEach(el => {
      el.classList.add('revealed');
    });
  }

  // --- 8. Dynamic Menu Loading from JSON ---
  async function loadDailyMenu() {
    try {
      const res = await fetch('/data/menu.json');
      if (!res.ok) return; // Keep hardcoded content as fallback
      const data = await res.json();

      const menuContainer = document.getElementById('menu-daily');
      if (!menuContainer || !data) return;

      // Build soup section
      let soupHTML = '';
      if (data.soup) {
        soupHTML = `
          <div class="menu-category scroll-reveal revealed">
            <h3 class="category-title"><i class="fa-solid fa-bowl-food"></i> Polévka</h3>
            <div class="menu-items">
              <div class="menu-item-card">
                <div class="menu-item-header">
                  <h4 class="menu-item-name">${escapeText(data.soup.name)}</h4>
                  <span class="menu-item-price">${data.soup.price} Kč</span>
                </div>
                <p class="menu-item-description">${escapeText(data.soup.description)}</p>
              </div>
            </div>
          </div>`;
      }

      // Build dishes section
      let dishesHTML = '';
      if (data.dishes && data.dishes.length > 0) {
        const dishCards = data.dishes.map(dish => `
          <div class="menu-item-card">
            <div class="menu-item-header">
              <h4 class="menu-item-name"><span class="item-number">${dish.id}</span> ${escapeText(dish.name)}</h4>
              <span class="menu-item-price">${dish.price} Kč</span>
            </div>
            <p class="menu-item-description">${escapeText(dish.description)}</p>
          </div>
        `).join('');

        dishesHTML = `
          <div class="menu-category scroll-reveal revealed">
            <h3 class="category-title"><i class="fa-solid fa-utensils"></i> Hlavní chody</h3>
            <div class="menu-items">${dishCards}</div>
            <div class="menu-note text-center">
              <p><i class="fa-solid fa-circle-info"></i> ${escapeText(data.note || 'Rádi vám vyměníme přílohu v rámci jiného denního menu.')}</p>
              <a href="http://eepurl.com/bTX329" target="_blank" class="btn btn-outline btn-sm btn-email-menu"><i class="fa-regular fa-envelope"></i> Chci menu na e-mail</a>
            </div>
          </div>`;
      }

      menuContainer.innerHTML = soupHTML + dishesHTML;
    } catch (err) {
      console.log('Using hardcoded menu (JSON fetch failed):', err.message);
    }
  }

  // --- 9. Dynamic Gallery Loading from JSON ---
  async function loadGallery() {
    try {
      const res = await fetch('/data/gallery.json');
      if (!res.ok) return; // Keep hardcoded content as fallback
      const data = await res.json();

      const galleryGrid = document.querySelector('.gallery-grid');
      if (!galleryGrid || !data || !data.images) return;

      // Sort by order
      const images = data.images.slice().sort((a, b) => a.order - b.order);

      // Fotky jednoho pokrmu spojíme do jedné dlaždice. Fotka bez pole `group`
      // (např. čerstvě nahraná v administraci) tvoří vlastní samostatnou skupinu.
      const groups = [];
      const byKey = new Map();

      images.forEach(img => {
        const key = img.group || `single-${img.id}`;
        let group = byKey.get(key);
        if (!group) {
          group = { key, title: '', photos: [], alt: img.alt };
          byKey.set(key, group);
          groups.push(group);
        }
        group.photos.push(img.src);
        // Popisek skupiny bere první vyplněnou hodnotu, kterou najde.
        if (!group.title) group.title = img.groupTitle || img.caption || '';
      });

      if (!groups.length) return;

      galleryGrid.innerHTML = groups.map(group => {
        const cover = group.photos[0];
        const coverThumb = cover.includes('/full/') ? cover.replace('/full/', '/thumb/') : cover;
        const count = group.photos.length;
        return `
        <button type="button" class="gallery-item" data-title="${escapeText(group.title)}" data-photos="${escapeText(group.photos.join(','))}">
          <img src="${coverThumb}" alt="${escapeText(group.alt || group.title)}" loading="lazy" />
          ${count > 1 ? `<span class="gallery-count"><i class="fa-regular fa-images"></i>${count}</span>` : ''}
        </button>
      `;
      }).join('');

      // Kliknutí řeší delegovaný listener na mřížce, takže se nic znovu nenavazuje.
    } catch (err) {
      console.log('Using hardcoded gallery (JSON fetch failed):', err.message);
    }
  }

  function escapeText(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    // Uvozovky navíc, protože výsledek plní i atributy (alt, data-*).
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  // Load dynamic content
  // Denní menu nyní řeší modul daily-menu-public.js (čte z Firestore).
  // loadDailyMenu();  // (ponecháno jako fallback, viz níže)
  loadGallery();
});
