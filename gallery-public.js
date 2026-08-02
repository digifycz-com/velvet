/* ==========================================================================
   PASÁŽ VELVET – VEŘEJNÁ FOTOGALERIE
   Jedna dlaždice = jedna kategorie jídel. Po kliknutí se otevře lightbox
   se všemi fotkami dané kategorie.

   Výchozí obsah se vykreslí okamžitě, uložená verze z administrace ho
   nahradí – stejně jako u stálého a nápojového lístku.
   ========================================================================== */

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { db, SITE_CONTENT_COLLECTION } from '/firebase-db.js';
import { esc } from '/menu-table.js';
import { DEFAULT_GALLERY, GALLERY_DOC } from '/gallery-data.js';

function validCategories(value) {
  return Array.isArray(value)
    ? value
      .filter((cat) => cat && typeof cat.title === 'string' && Array.isArray(cat.photos))
      .map((cat) => ({
        ...cat,
        photos: cat.photos.filter((p) => p && p.url),
      }))
      .filter((cat) => cat.photos.length)
    : [];
}

function render(categories) {
  const grid = document.querySelector('.gallery-grid');
  if (!grid || !categories.length) return;

  grid.innerHTML = categories.map((cat) => {
    const cover = cat.photos[0];
    const count = cat.photos.length;
    const urls = cat.photos.map((p) => p.url).join(',');
    return `
      <button type="button" class="gallery-item" data-title="${esc(cat.title)}" data-photos="${esc(urls)}">
        <img src="${esc(cover.thumbUrl || cover.url)}" alt="${esc(cover.alt || cat.title)}" loading="lazy" />
        <span class="gallery-label">${esc(cat.title)}</span>
        <span class="gallery-count"><i class="fa-regular fa-images"></i>${count}</span>
      </button>`;
  }).join('');
}

async function init() {
  if (!document.querySelector('.gallery-grid')) return;

  render(DEFAULT_GALLERY);

  try {
    const snap = await getDoc(doc(db, SITE_CONTENT_COLLECTION, GALLERY_DOC));
    const categories = snap.exists() ? validCategories(snap.data().categories) : [];
    if (categories.length) render(categories);
  } catch (err) {
    console.log('Galerii se nepodařilo načíst, používám výchozí obsah:', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
