/* ==========================================================================
   PASÁŽ VELVET - VEŘEJNÉ AKTUALITY
   Načte dvě pevné dlaždice z Firestore. Statický obsah v HTML slouží jako
   bezpečná záloha, pokud dokument ještě neexistuje nebo se nepodaří načíst.
   ========================================================================== */

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC,
} from '/firebase-db.js';

function createNewsCard(item) {
  const article = document.createElement('article');
  article.className = 'news-card scroll-reveal revealed';

  const label = document.createElement('span');
  label.className = 'news-card-label';
  label.textContent = item.label || 'Velvet';

  const title = document.createElement('h3');
  title.textContent = item.title || '';

  const text = document.createElement('p');
  text.textContent = item.text || '';

  article.append(label, title, text);
  return article;
}

async function init() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  try {
    const ref = doc(db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC);
    const snap = await getDoc(ref);
    const news = snap.exists() ? snap.data().news : null;
    if (!Array.isArray(news) || news.length < 2) return;

    grid.replaceChildren(
      createNewsCard(news[0] || {}),
      createNewsCard(news[1] || {}),
    );
  } catch (err) {
    console.log('Aktuality se nepodařilo načíst, ponechávám výchozí obsah:', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
