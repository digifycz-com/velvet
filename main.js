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
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    // Toggle sticky class
    if (window.scrollY > 50) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }

    // Scroll tracking active nav links
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= (sectionTop - 120)) {
        current = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href').slice(1) === current) {
        item.classList.add('active');
      }
    });
  });

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
  const menuDaily = document.getElementById('menu-daily');
  const menuSeasonal = document.getElementById('menu-seasonal');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove active states
      tabButtons.forEach(button => button.classList.remove('active'));
      
      // Add active state to clicked button
      btn.classList.add('active');
      
      // Get target menu category
      const target = btn.getAttribute('data-target');
      
      if (target === 'daily') {
        menuDaily.classList.add('active');
        menuSeasonal.classList.remove('active');
      } else if (target === 'seasonal') {
        menuSeasonal.classList.add('active');
        menuDaily.classList.remove('active');
      }
    });
  });

  // --- 5. Reservation Form Validation & Custom Workflow ---
  const reservationForm = document.getElementById('reservation-form');
  const reservationSuccess = document.getElementById('reservation-success');
  const submitBtn = document.getElementById('submit-btn');
  const resetResBtn = document.getElementById('reset-res-btn');
  const dateInput = document.getElementById('res-date');

  // Set minimum date to today for the reservation input
  if (dateInput) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0
    const yyyy = today.getFullYear();
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  if (reservationForm && reservationSuccess) {
    reservationForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Show loader on submit button
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      // Extract form values
      const name = document.getElementById('res-name').value;
      const phone = document.getElementById('res-phone').value;
      const email = document.getElementById('res-email').value;
      const guests = document.getElementById('res-guests').value;
      const rawDate = dateInput.value;
      const time = document.getElementById('res-time').value;

      // Format Czech Date (dd. mm. yyyy)
      const dateParts = rawDate.split('-');
      const formattedDate = dateParts.length === 3 
        ? `${parseInt(dateParts[2])}. ${parseInt(dateParts[1])}. ${dateParts[0]}`
        : rawDate;

      // Simulate API submission delay
      setTimeout(() => {
        // Populating confirmation summary card details
        document.getElementById('summary-name').textContent = name;
        document.getElementById('summary-guests').textContent = guests;
        document.getElementById('summary-date').textContent = formattedDate;
        document.getElementById('summary-time').textContent = time;
        document.getElementById('summary-email').textContent = email;

        // Hide form, show success container
        reservationForm.style.display = 'none';
        reservationSuccess.style.display = 'flex';

        // Reset submit button state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        // Scroll to reservation container top smoothly
        document.getElementById('rezervace').scrollIntoView({ behavior: 'smooth' });
      }, 1500);
    });

    // Reset reservation button handler
    if (resetResBtn) {
      resetResBtn.addEventListener('click', () => {
        reservationForm.reset();
        
        // Set date input to today again
        if (dateInput) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
        
        reservationSuccess.style.display = 'none';
        reservationForm.style.display = 'block';
      });
    }
  }

  // --- 6. Gallery Lightbox Modal ---
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.querySelector('.lightbox-close');

  if (galleryItems.length > 0 && lightbox && lightboxImg) {
    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const imgSrc = item.getAttribute('data-image');
        const imgCaption = item.querySelector('.gallery-overlay span').textContent;
        
        lightboxImg.src = imgSrc;
        lightboxCaption.textContent = imgCaption;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => {
        lightboxImg.src = '';
        lightboxCaption.textContent = '';
      }, 400);
    };

    lightboxClose.addEventListener('click', closeLightbox);
    
    // Close on click outside the image
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
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
      const images = data.images.sort((a, b) => a.order - b.order);

      galleryGrid.innerHTML = images.map(img => `
        <div class="gallery-item" data-image="${img.src}">
          <img src="${img.src}" alt="${escapeText(img.alt)}" loading="lazy" />
          <div class="gallery-overlay">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
            <span>${escapeText(img.caption)}</span>
          </div>
        </div>
      `).join('');

      // Re-attach lightbox events for dynamically loaded images
      const newGalleryItems = galleryGrid.querySelectorAll('.gallery-item');
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightbox-img');
      const lightboxCaption = document.getElementById('lightbox-caption');

      if (newGalleryItems.length > 0 && lightbox && lightboxImg) {
        newGalleryItems.forEach(item => {
          item.addEventListener('click', () => {
            const imgSrc = item.getAttribute('data-image');
            const imgCaption = item.querySelector('.gallery-overlay span').textContent;
            lightboxImg.src = imgSrc;
            lightboxCaption.textContent = imgCaption;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
          });
        });
      }
    } catch (err) {
      console.log('Using hardcoded gallery (JSON fetch failed):', err.message);
    }
  }

  function escapeText(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Load dynamic content
  loadDailyMenu();
  loadGallery();
});

