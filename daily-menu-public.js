/* ==========================================================================
   PASÁŽ VELVET - VEŘEJNÉ DENNÍ MENU (landing page)
   Načte denní menu z Firestore, zobrazí dnešní den a umožní listovat
   mezi dostupnými dny (šipky + kalendář).
   ========================================================================== */

import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { db, MENU_COLLECTION } from '/firebase-db.js';
import { CATEGORIES } from '/menu-parser.js';
import { CATEGORY_ORDER, CATEGORY_ICONS, esc } from '/menu-table.js';

let days = [];
let currentIndex = 0;

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatDateLabel(day) {
  let label = '';
  if (day.date) {
    const parsed = Date.parse(day.date);
    if (!Number.isNaN(parsed)) {
      label = new Date(parsed).toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'numeric', year: 'numeric',
      });
    } else {
      label = day.date;
    }
  }
  if (day.day) return `${day.day} ${label}`.trim();
  return label;
}

function groupByCategory(items) {
  const groups = {};
  for (const it of items || []) (groups[it.category] ||= []).push(it);
  return groups;
}

function cardHTML(item, category) {
  const number = category === 'hlavni' && item.number
    ? `<span class="item-number">${esc(item.number)}</span> `
    : '';
  const price = item.price != null && item.price !== '' ? `${esc(item.price)} Kč` : '';
  const desc = item.description
    ? `<p class="menu-item-description">${esc(item.description)}</p>`
    : '';
  return `
    <div class="menu-item-card">
      <div class="menu-item-header">
        <h4 class="menu-item-name">${number}${esc(item.name)}</h4>
        ${price ? `<span class="menu-item-price">${price}</span>` : ''}
      </div>
      ${desc}
    </div>`;
}

function navBarHTML() {
  const day = days[currentIndex];
  const isToday = day && day.date === todayISO();
  const prevDisabled = currentIndex <= 0 ? 'disabled' : '';
  const nextDisabled = currentIndex >= days.length - 1 ? 'disabled' : '';
  return `
    <div class="daily-nav scroll-reveal revealed">
      <button class="daily-nav-btn" id="daily-prev" ${prevDisabled} aria-label="Předchozí den">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="daily-nav-center">
        <span class="daily-nav-date">${esc(formatDateLabel(day))}</span>
        ${isToday ? '<span class="daily-nav-today">Dnes</span>' : ''}
        <label class="daily-nav-cal" title="Vybrat datum">
          <i class="fa-regular fa-calendar"></i>
          <input type="date" id="daily-date" value="${esc(day?.date || '')}" />
        </label>
      </div>
      <button class="daily-nav-btn" id="daily-next" ${nextDisabled} aria-label="Další den">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>`;
}

function noteBlockHTML() {
  return `
    <div class="menu-note text-center scroll-reveal revealed">
      <p><i class="fa-solid fa-circle-info"></i> Rádi vám vyměníme přílohu v rámci jiného denního menu.</p>
      <a href="http://eepurl.com/bTX329" target="_blank" class="btn btn-outline btn-sm btn-email-menu">
        <i class="fa-regular fa-envelope"></i> Chci menu na e-mail
      </a>
    </div>`;
}

function render() {
  const container = document.getElementById('menu-daily');
  if (!container) return;

  const day = days[currentIndex];
  if (!day) return;

  const groups = groupByCategory(day.items);
  let html = navBarHTML();

  for (const cat of CATEGORY_ORDER) {
    const list = groups[cat];
    if (!list || !list.length) continue;
    const icon = CATEGORY_ICONS[cat] || 'fa-utensils';
    const cards = list.map((it) => cardHTML(it, cat)).join('');
    html += `
      <div class="menu-category scroll-reveal revealed">
        <h3 class="category-title"><i class="fa-solid ${icon}"></i> ${esc(CATEGORIES[cat] || cat)}</h3>
        <div class="menu-items">${cards}</div>
      </div>`;
  }

  html += noteBlockHTML();
  container.innerHTML = html;
  wireNav();
}

function wireNav() {
  document.getElementById('daily-prev')?.addEventListener('click', () => {
    if (currentIndex > 0) { currentIndex--; render(); }
  });
  document.getElementById('daily-next')?.addEventListener('click', () => {
    if (currentIndex < days.length - 1) { currentIndex++; render(); }
  });
  document.getElementById('daily-date')?.addEventListener('change', (e) => {
    const target = e.target.value;
    if (!target) return;
    // Přesně, nebo nejbližší následující dostupný den.
    let idx = days.findIndex((d) => d.date === target);
    if (idx === -1) idx = days.findIndex((d) => d.date >= target);
    if (idx === -1) idx = days.length - 1;
    currentIndex = idx;
    render();
  });
}

function pickInitialIndex() {
  const today = todayISO();
  // days je seřazené vzestupně podle data.
  let idx = days.findIndex((d) => d.date === today);
  if (idx === -1) idx = days.findIndex((d) => d.date >= today); // nejbližší budoucí
  if (idx === -1) idx = days.length - 1; // jinak poslední (nejnovější minulé)
  return Math.max(0, idx);
}

async function init() {
  const container = document.getElementById('menu-daily');
  if (!container) return;

  try {
    const q = query(collection(db, MENU_COLLECTION), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) return; // ponecháme statický fallback v HTML

    days = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      days.push({ date: d.date || docSnap.id, day: d.day || '', items: d.items || [] });
    });

    currentIndex = pickInitialIndex();
    render();
  } catch (err) {
    // Při chybě (nebo chybějícím oprávnění) ponecháme statický obsah.
    console.log('Denní menu z Firestore se nenačetlo, ponechávám statický obsah:', err.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
