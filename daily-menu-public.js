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
// Jakmile si někdo sám přelistuje den, nepřepisujeme mu volbu v 16:30.
let userPickedDay = false;

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftISO(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Okno poledního menu počítá inline skript v <head> index.html (pražský čas,
   přepnutí v 16:30). Tady ho jen čteme; fallback = dnešní den. */
function lunchWindow() {
  const win = window.velvetLunchWindow?.();
  if (win?.date) return win;
  const today = todayISO();
  return {
    mode: 'today',
    date: today,
    today,
    tomorrow: shiftISO(today, 1),
    msUntilSwitch: null,
  };
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
  for (const it of items || []) {
    // Prázdné řádky z importu (jen cena, bez názvu) do veřejného menu nepatří.
    if (!it?.name || !String(it.name).trim()) continue;
    (groups[it.category] ||= []).push(it);
  }
  return groups;
}

function cardHTML(item, category) {
  const number = category === 'hlavni' && item.number
    ? `<span class="item-number" aria-label="Hlavní jídlo číslo ${esc(item.number)}">
        <i class="fa-solid fa-utensils" aria-hidden="true"></i>
        <span>${esc(item.number)}</span>
      </span> `
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
  const win = lunchWindow();
  let badge = '';
  if (day?.date === win.today) badge = 'Dnes';
  else if (day?.date === win.tomorrow) badge = 'Zítra';
  const prevDisabled = currentIndex <= 0 ? 'disabled' : '';
  const nextDisabled = currentIndex >= days.length - 1 ? 'disabled' : '';
  return `
    <div class="daily-nav scroll-reveal revealed">
      <button class="daily-nav-btn" id="daily-prev" ${prevDisabled} aria-label="Předchozí den">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="daily-nav-center">
        <span class="daily-nav-date">${esc(formatDateLabel(day))}</span>
        ${badge ? `<span class="daily-nav-today">${badge}</span>` : ''}
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
    if (cat === 'napoj') continue; // nápoje jsou interní údaj pro exportní platformy
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
    if (currentIndex > 0) { currentIndex--; userPickedDay = true; render(); }
  });
  document.getElementById('daily-next')?.addEventListener('click', () => {
    if (currentIndex < days.length - 1) { currentIndex++; userPickedDay = true; render(); }
  });
  document.getElementById('daily-date')?.addEventListener('change', (e) => {
    const target = e.target.value;
    if (!target) return;
    userPickedDay = true;
    // Přesně, nebo nejbližší následující dostupný den.
    let idx = days.findIndex((d) => d.date === target);
    if (idx === -1) idx = days.findIndex((d) => d.date >= target);
    if (idx === -1) idx = days.length - 1;
    currentIndex = idx;
    render();
  });
}

/* Sekce Menu startuje na stejném dni jako karta v heru – tedy po 16:30
   už na zítřejší nabídce. */
function pickInitialIndex() {
  const { date } = lunchWindow();
  // days je seřazené vzestupně podle data.
  let idx = days.findIndex((d) => d.date === date);
  if (idx === -1) idx = days.findIndex((d) => d.date >= date); // nejbližší budoucí
  if (idx === -1) idx = days.length - 1; // jinak poslední (nejnovější minulé)
  return Math.max(0, idx);
}

function heroMetaHTML(item) {
  if (item.category === 'polevka') {
    return `
      <span class="hero-daily-number hero-daily-icon" role="img" aria-label="Polévka">
        <i class="fa-solid fa-bowl-food" aria-hidden="true"></i>
      </span>`;
  }
  if (item.category === 'hlavni' && item.number) {
    return `
      <span class="hero-daily-number hero-daily-main" aria-label="Hlavní jídlo číslo ${esc(item.number)}">
        <i class="fa-solid fa-utensils" aria-hidden="true"></i>
        <span>${esc(item.number)}</span>
      </span>`;
  }
  if (item.category === 'dezert') {
    return `
      <span class="hero-daily-number hero-daily-icon" role="img" aria-label="Dezert">
        <i class="fa-solid fa-ice-cream" aria-hidden="true"></i>
      </span>`;
  }
  return `
    <span class="hero-daily-number hero-daily-icon" role="img" aria-label="Položka menu">
      <i class="fa-solid fa-utensils" aria-hidden="true"></i>
    </span>`;
}

/* Přepne texty a umístění karty podle toho, jestli zveme na dnešní oběd,
   nebo už jen ukazujeme, co bude zítra. */
function applyLunchMode(mode) {
  const root = document.documentElement;
  root.classList.toggle('lunch-today', mode === 'today');
  root.classList.toggle('lunch-tomorrow', mode === 'tomorrow');

  const kickerEl = document.getElementById('hero-daily-kicker');
  const titleEl = document.getElementById('hero-menu-title');
  const headingEl = document.getElementById('hero-daily-heading');
  const headEl = document.getElementById('hero-daily-head');
  const dateEl = document.getElementById('hero-daily-date');

  if (kickerEl) {
    kickerEl.textContent = mode === 'tomorrow' ? 'Zítra podáváme' : 'Dnes podáváme';
  }
  if (titleEl) {
    titleEl.textContent = mode === 'tomorrow' ? 'Polední menu na zítra' : 'Polední menu';
  }
  // Po 16:30 patří datum pod titulek, ať je jasné, na který den nabídka je.
  if (headingEl && headEl && dateEl) {
    headEl.classList.toggle('hero-daily-head--stacked', mode === 'tomorrow');
    const target = mode === 'tomorrow' ? headingEl : headEl;
    if (dateEl.parentElement !== target) target.appendChild(dateEl);
  }
}

function renderHeroMenu() {
  const dateEl = document.getElementById('hero-daily-date');
  const itemsEl = document.getElementById('hero-daily-items');
  if (!dateEl || !itemsEl) return;

  const { mode, date } = lunchWindow();
  applyLunchMode(mode);

  const day = days.find((item) => item.date === date);
  dateEl.textContent = new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'numeric',
  });

  const publicItems = (day?.items || []).filter((item) => (
    item.name && item.category !== 'napoj'
  ));

  if (!publicItems.length) {
    itemsEl.innerHTML = `
      <div class="hero-daily-empty">
        <i class="fa-regular fa-calendar-xmark"></i>
        <p>${mode === 'tomorrow' ? 'Zítřejší' : 'Dnešní'} nabídku právě připravujeme.</p>
        <span>Podívejte se prosím později nebo nám zavolejte.</span>
      </div>`;
    return;
  }

  const preferred = publicItems.filter((item) => (
    item.category === 'polevka' || item.category === 'hlavni'
  ));
  const remaining = publicItems.filter((item) => (
    item.category !== 'polevka' && item.category !== 'hlavni'
  ));
  const visible = [...preferred, ...remaining].slice(0, 6);

  itemsEl.innerHTML = visible.map((item) => {
    const price = item.price != null && item.price !== '' ? `${esc(item.price)} Kč` : '';
    // Polévky a dezerty popis z importu většinou nemají – řádek pak zůstane jednořádkový.
    const description = String(item.description || '').trim();
    const desc = description
      ? `<span class="hero-daily-desc">${esc(description)}</span>`
      : '';
    return `
      <div class="hero-daily-item">
        ${heroMetaHTML(item)}
        <div class="hero-daily-text">
          <span class="hero-daily-name">${esc(item.name)}</span>
          ${desc}
        </div>
        ${price ? `<span class="hero-daily-price">${price}</span>` : ''}
      </div>`;
  }).join('');
}

/* Stránka může zůstat otevřená přes 16:30 nebo přes půlnoc – v ten moment
   kartu přerenderujeme, ať nikdo nekouká na neaktuální den. */
function scheduleLunchSwitch() {
  const { msUntilSwitch } = lunchWindow();
  if (!msUntilSwitch || msUntilSwitch <= 0) return;
  // setTimeout nad ~24,8 dne přeteče; tady jde max o 24 h, takže je to v pohodě.
  window.setTimeout(() => {
    renderHeroMenu();
    if (days.length && !userPickedDay) {
      currentIndex = pickInitialIndex();
      render();
    }
    scheduleLunchSwitch();
  }, msUntilSwitch);
}

async function init() {
  const container = document.getElementById('menu-daily');
  if (!container) return;

  scheduleLunchSwitch();

  try {
    const q = query(collection(db, MENU_COLLECTION), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      renderHeroMenu();
      return; // ponecháme statický fallback plného menu v HTML
    }

    days = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      days.push({ date: d.date || docSnap.id, day: d.day || '', items: d.items || [] });
    });

    currentIndex = pickInitialIndex();
    renderHeroMenu();
    render();
  } catch (err) {
    // Při chybě (nebo chybějícím oprávnění) ponecháme statický obsah.
    console.log('Denní menu z Firestore se nenačetlo, ponechávám statický obsah:', err.message);
    renderHeroMenu();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
