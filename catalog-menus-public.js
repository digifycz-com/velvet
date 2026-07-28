/* ==========================================================================
   PASÁŽ VELVET – VEŘEJNÉ STÁLÉ A NÁPOJOVÉ MENU
   Výchozí obsah se zobrazí okamžitě, uložená verze z administrace jej nahradí.
   ========================================================================== */

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { db, SITE_CONTENT_COLLECTION } from '/firebase-db.js';
import { esc } from '/menu-table.js';
import {
  DEFAULT_PERMANENT_MENU,
  DEFAULT_DRINK_MENU,
  PERMANENT_MENU_DOC,
  DRINK_MENU_DOC,
} from '/catalog-menu-data.js';

const ICONS = {
  polevky: 'fa-bowl-food',
  'na-zacatek': 'fa-seedling',
  'k-pivu': 'fa-beer-mug-empty',
  salaty: 'fa-leaf',
  'smazena-klasika': 'fa-utensils',
  'ceska-kuchyne': 'fa-kitchen-set',
  'burger-a-bbq': 'fa-burger',
  'samostatne-prilohy': 'fa-bowl-rice',
  'grilovana-masa': 'fa-fire-burner',
  'pro-deti': 'fa-child',
  prilohy: 'fa-plate-wheat',
  omacky: 'fa-jar',
  dezerty: 'fa-ice-cream',
  aperitiv: 'fa-martini-glass',
  whiskey: 'fa-whiskey-glass',
  destilaty: 'fa-bottle-droplet',
  rum: 'fa-bottle-droplet',
  gin: 'fa-martini-glass-citrus',
  likery: 'fa-whiskey-glass',
  pivo: 'fa-beer-mug-empty',
  'bile-vino': 'fa-wine-glass',
  'cervene-vino': 'fa-wine-glass',
  'sumive-vino': 'fa-champagne-glasses',
  'ovocne-vino': 'fa-wine-bottle',
  nealkoholicke: 'fa-glass-water',
  'teple-napoje': 'fa-mug-hot',
};

function validCategories(value) {
  return Array.isArray(value)
    ? value.filter((category) => (
      category
      && typeof category.title === 'string'
      && Array.isArray(category.items)
    ))
    : [];
}

function renderMenu(containerId, categories) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = categories.map((category) => {
    const items = category.items.filter((item) => item?.name);
    if (!items.length) return '';
    const icon = ICONS[category.id] || 'fa-utensils';
    return `
      <section class="catalog-category">
        <h3 class="category-title">
          <i class="fa-solid ${icon}"></i> ${esc(category.title)}
        </h3>
        <div class="catalog-items">
          ${items.map((item) => `
            <article class="catalog-item">
              <div class="catalog-item-line">
                <h4>${esc(item.name)}</h4>
                <span class="catalog-item-dots" aria-hidden="true"></span>
                ${item.price !== '' && item.price != null ? `<strong>${esc(item.price)} Kč</strong>` : ''}
              </div>
              ${item.description ? `<p>${esc(item.description)}</p>` : ''}
            </article>
          `).join('')}
        </div>
      </section>`;
  }).join('');
}

async function loadStoredMenu(docId, fallback) {
  try {
    const snap = await getDoc(doc(db, SITE_CONTENT_COLLECTION, docId));
    const categories = snap.exists() ? validCategories(snap.data().categories) : [];
    return categories.length ? categories : fallback;
  } catch (err) {
    console.log(`Menu ${docId} se nepodařilo načíst, používám výchozí obsah:`, err.message);
    return fallback;
  }
}

async function init() {
  renderMenu('menu-permanent', DEFAULT_PERMANENT_MENU);
  renderMenu('menu-drinks', DEFAULT_DRINK_MENU);

  const [permanent, drinks] = await Promise.all([
    loadStoredMenu(PERMANENT_MENU_DOC, DEFAULT_PERMANENT_MENU),
    loadStoredMenu(DRINK_MENU_DOC, DEFAULT_DRINK_MENU),
  ]);

  renderMenu('menu-permanent', permanent);
  renderMenu('menu-drinks', drinks);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
