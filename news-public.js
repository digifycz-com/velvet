/* ==========================================================================
   PASÁŽ VELVET - VEŘEJNÉ AKTUALITY
   Načte dvě pevné dlaždice z Firestore a vykreslí je na dvou místech:
   v sekci Aktuality a zkráceně v heru. Statický obsah v HTML slouží jako
   bezpečná záloha, pokud dokument ještě neexistuje nebo se nepodaří načíst.
   ========================================================================== */

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC,
} from '/firebase-db.js';

/* Starší dokumenty mají jen textové pole, novější k tomu `images`. */
function imagesOf(item) {
  return Array.isArray(item.images)
    ? item.images.filter((img) => img && img.url)
    : [];
}

function createNewsCard(item) {
  const article = document.createElement('article');
  article.className = 'news-card scroll-reveal revealed';

  const images = imagesOf(item);
  if (images.length) {
    article.classList.add('news-card--photo');

    const img = document.createElement('img');
    img.className = 'news-card-img';
    img.src = images[0].url;
    img.alt = '';
    img.loading = 'lazy';
    article.appendChild(img);

    // Víc fotek otevře stejný lightbox jako galerie.
    if (typeof window.velvetOpenGallery === 'function') {
      article.classList.add('news-card--clickable');
      article.tabIndex = 0;
      article.setAttribute('role', 'button');
      const open = () => window.velvetOpenGallery(
        images.map((i) => i.url), item.title || 'Aktuality', article,
      );
      article.addEventListener('click', open);
      article.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    }

    if (images.length > 1) {
      const count = document.createElement('span');
      count.className = 'news-card-count';
      count.innerHTML = '<i class="fa-regular fa-images"></i>';
      count.append(String(images.length));
      article.appendChild(count);
    }
  }

  const body = document.createElement('div');
  body.className = 'news-card-body';

  const label = document.createElement('span');
  label.className = 'news-card-label';
  label.textContent = item.label || 'Velvet';

  const title = document.createElement('h3');
  title.textContent = item.title || '';

  const text = document.createElement('p');
  text.textContent = item.text || '';

  body.append(label, title, text);
  article.appendChild(body);
  return article;
}

function createHeroItem(item) {
  const link = document.createElement('a');
  link.className = 'hero-news-item';
  link.href = '#aktuality';

  const images = imagesOf(item);
  if (images.length) {
    const thumb = document.createElement('img');
    thumb.className = 'hero-news-thumb';
    thumb.src = images[0].thumbUrl || images[0].url;
    thumb.alt = '';
    thumb.loading = 'lazy';
    link.appendChild(thumb);
  }

  const label = document.createElement('span');
  label.className = 'hero-news-label';
  label.textContent = item.label || 'Velvet';

  const title = document.createElement('span');
  title.className = 'hero-news-title';
  title.textContent = item.title || '';

  link.append(label, title);
  return link;
}

function render(news) {
  const grid = document.getElementById('news-grid');
  if (grid) {
    grid.replaceChildren(
      createNewsCard(news[0] || {}),
      createNewsCard(news[1] || {}),
    );
  }

  const heroItems = document.getElementById('hero-news-items');
  if (heroItems) {
    heroItems.replaceChildren(
      createHeroItem(news[0] || {}),
      createHeroItem(news[1] || {}),
    );
  }
}

async function init() {
  if (!document.getElementById('news-grid') && !document.getElementById('hero-news-items')) {
    return;
  }

  try {
    const ref = doc(db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC);
    const snap = await getDoc(ref);
    const news = snap.exists() ? snap.data().news : null;
    if (!Array.isArray(news) || news.length < 2) return;

    render(news);
  } catch (err) {
    console.log('Aktuality se nepodařilo načíst, ponechávám výchozí obsah:', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
