/* ==========================================================================
   PASÁŽ VELVET - SPRÁVA DENNÍCH MENU (záložka „Denní menu")
   Seznam uložených dnů z Firestore + editace jednotlivého dne + stav exportu
   na platformy (Foodora / Wolt / Menicka).
   ========================================================================== */

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

import {
  db, MENU_COLLECTION, SYNC_PLATFORMS, PLATFORM_LABELS,
} from '/firebase-db.js';
import { CATEGORIES } from '/menu-parser.js';
import {
  renderRows, addEmptyRow, readRows, freshSync,
  markNamelessRows, CATEGORY_ORDER, SYNC_STATUS, esc,
} from '/menu-table.js';

function $(id) { return document.getElementById(id); }

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info',
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

let editingDate = null; // null = nový den

// ==========================================================================
// DATUMY – pojmenování dnů a řazení seznamu
// ==========================================================================

const WEEKDAY_FMT = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long' });
const DATE_FMT = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });

// Dnešek jako "YYYY-MM-DD" v místním čase. Přes toISOString() to nejde –
// ta počítá v UTC a večer by vracela už zítřek.
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Poledne = datum přežije i přechod na letní/zimní čas.
function dateFromISO(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : null;
}

function weekdayName(iso) {
  const d = dateFromISO(iso);
  return d ? WEEKDAY_FMT.format(d) : '';
}

function humanDate(iso) {
  const d = dateFromISO(iso);
  return d ? DATE_FMT.format(d) : iso;
}

function shiftISO(iso, days) {
  const d = dateFromISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// „Dnes" / „Zítra" – jen pro dva nejbližší dny, jinak prázdné.
function relativeLabel(iso, today) {
  if (iso === today) return 'Dnes';
  if (iso === shiftISO(today, 1)) return 'Zítra';
  return '';
}

/* Řazení seznamu: nahoře nejbližší nadcházející den (dnešek, zítřek, …)
   vzestupně, teprve pod nimi už proběhlé dny od nejnovějšího. Čistě sestupně
   podle data by nahoru vyplaval nejvzdálenější naplánovaný den – a ten, který
   se edituje nejčastěji, by skončil uprostřed seznamu. */
function splitByToday(entries, today) {
  const upcoming = entries.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = entries.filter((e) => e.date < today).sort((a, b) => (a.date > b.date ? -1 : 1));
  return { upcoming, past };
}

// ==========================================================================
// ÚKLID STARÉ HISTORIE
// ==========================================================================

// Kolik dnů dozadu zůstává v databázi (kromě dneška).
const KEEP_PAST_DAYS = 2;

/* Maže dny starší než KEEP_PAST_DAYS. Běží při každém načtení seznamu –
   naplánovaná Cloud Function by byla spolehlivější, ale její nasazení vyžaduje
   oprávnění, které tenhle účet nemá. V praxi to stačí: admin se otevírá pokaždé,
   když se přidává menu. Vrací dny, které mají zůstat v seznamu. */
async function purgeOldDays(entries, today) {
  // Pojistka proti rozbitým hodinám v počítači – při resetnutém datu (1970,
  // 2001) by se jinak smazalo úplně všechno.
  if (today < '2025-01-01') return entries;

  const cutoff = shiftISO(today, -KEEP_PAST_DAYS);
  const stale = entries.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date < cutoff);
  if (!stale.length) return entries;

  const results = await Promise.allSettled(
    stale.map((e) => deleteDoc(doc(db, MENU_COLLECTION, e.id)))
  );

  const deletedIds = new Set();
  results.forEach((res, i) => { if (res.status === 'fulfilled') deletedIds.add(stale[i].id); });

  const failed = stale.length - deletedIds.size;
  if (deletedIds.size) {
    toast(`Uklizeno ${deletedIds.size} starých dnů (do ${humanDate(cutoff)}).`, 'info');
  }
  if (failed) {
    console.error('Úklid starých dnů selhal u', failed, 'záznamů');
    toast(`${failed} starých dnů se nepodařilo smazat.`, 'error');
  }

  // Nepovedené necháme v seznamu, ať je vidět, že tam pořád jsou.
  return entries.filter((e) => !deletedIds.has(e.id));
}

// ==========================================================================
// SEZNAM DNŮ
// ==========================================================================

function groupHeaderHTML(text, count) {
  return `<div class="dm-group-head"><span>${esc(text)}</span><span class="dm-group-count">${count}</span></div>`;
}

function pastToggleHTML(count) {
  return `
    <button type="button" class="dm-group-head dm-past-toggle" aria-expanded="false">
      <span>Proběhlo</span>
      <span class="dm-group-count">${count}</span>
      <i class="fa-solid fa-chevron-down"></i>
    </button>`;
}

function wirePastToggle(list, wrap) {
  const btn = list.querySelector('.dm-past-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = wrap.hidden;
    wrap.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('is-open', open);
  });
}

export async function loadList() {
  const list = $('dm-list');
  if (!list) return;
  list.innerHTML = '<div class="import-saved-empty"><i class="fa-solid fa-circle-notch fa-spin"></i> Načítání denních menu…</div>';

  try {
    const q = query(collection(db, MENU_COLLECTION), orderBy('date', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<div class="import-saved-empty">Zatím nejsou uložena žádná denní menu. Importujte je v záložce „Import z Excelu" nebo přidejte nový den.</div>';
      return;
    }

    const entries = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({ id: docSnap.id, data, date: String(data.date || docSnap.id || '').slice(0, 10) });
    });

    const today = todayISO();
    const { upcoming, past } = splitByToday(await purgeOldDays(entries, today), today);

    list.innerHTML = '';
    if (upcoming.length) {
      list.insertAdjacentHTML('beforeend', groupHeaderHTML('Nadcházející', upcoming.length));
      for (const e of upcoming) list.appendChild(renderCard(e.id, e.data, today));
    }
    if (past.length) {
      // Proběhlé dny zůstávají v databázi, ale v seznamu jsou sbalené –
      // jinak se v nich aktuální nabídka utopí. Rozbalí se kliknutím.
      list.insertAdjacentHTML('beforeend', pastToggleHTML(past.length));
      const wrap = document.createElement('div');
      wrap.className = 'dm-past-wrap';
      wrap.hidden = true;
      for (const e of past) wrap.appendChild(renderCard(e.id, e.data, today, true));
      list.appendChild(wrap);
      wirePastToggle(list, wrap);
    }

    wireCardButtons();
    tickCountdowns();
  } catch (err) {
    console.error('Firestore load error:', err);
    if (String(err.code || '').includes('permission')) {
      list.innerHTML = '<div class="import-saved-empty">Menu se nepodařilo načíst (chybí oprávnění).</div>';
    } else {
      list.innerHTML = `<div class="import-saved-empty">Chyba při načítání: ${esc(err.message)}</div>`;
    }
  }
}

// Refresh volaný z import modulu po uložení.
export function notifyMenusChanged() {
  loadList();
}

function itemsPreviewHTML(items) {
  if (!items || !items.length) return '<span class="dm-prev-empty">Bez položek</span>';
  const groups = {};
  for (const it of items) (groups[it.category] ||= []).push(it);

  const sections = [];
  for (const cat of CATEGORY_ORDER) {
    if (!groups[cat]) continue;
    const list = groups[cat];
    const rows = list
      .map((it) => {
        const num = it.number ? `<span class="dm-prev-num">${esc(it.number)}.</span> ` : '';
        const name = esc(it.name || '—');
        const price = (it.price != null && it.price !== '')
          ? `<span class="dm-prev-price">${esc(it.price)} Kč</span>` : '';
        return `<li class="dm-prev-item">${num}<span class="dm-prev-name">${name}</span>${price}</li>`;
      })
      .join('');
    const countBadge = list.length > 1 ? `<span class="dm-prev-count">${list.length}×</span>` : '';
    sections.push(`
      <div class="dm-prev-section">
        <div class="dm-prev-cat">${esc(CATEGORIES[cat] || cat)} ${countBadge}</div>
        <ul class="dm-prev-list">${rows}</ul>
      </div>`);
  }
  return sections.join('');
}

function syncBlockHTML(sync) {
  const chips = SYNC_PLATFORMS.map((p) => {
    const st = (sync && sync.platforms && sync.platforms[p]) || { status: 'pending' };
    const meta = SYNC_STATUS[st.status] || SYNC_STATUS.pending;
    return `<span class="dm-chip ${meta.cls}"><i class="fa-solid ${meta.icon}"></i> ${esc(PLATFORM_LABELS[p])}: ${meta.label}</span>`;
  }).join('');

  const scheduled = sync && sync.scheduledFor ? sync.scheduledFor : '';
  const processed = sync && sync.processed ? '1' : '';
  return `
    <div class="dm-sync">
      <div class="dm-chips">${chips}</div>
      <div class="dm-sync-actions">
        <span class="dm-countdown" data-scheduled="${esc(scheduled)}" data-processed="${processed}"></span>
      </div>
    </div>`;
}

function renderCard(id, d, today, isPast = false) {
  const date = String(d.date || id || '').slice(0, 10);
  // Den v týdnu počítáme z data. Pole `day` z Excelu bývá prázdné, takže
  // v kartě dřív nebylo poznat, na jaký den menu vlastně je.
  const weekday = weekdayName(date);
  const relative = relativeLabel(date, today);

  const card = document.createElement('div');
  card.className = `dm-card${isPast ? ' is-past' : ''}`;
  card.dataset.id = id;
  card.innerHTML = `
    <div class="dm-card-head">
      <div class="dm-card-title">
        <span class="dm-date">
          <i class="fa-regular fa-calendar"></i>
          ${weekday ? `<span class="dm-weekday">${esc(weekday)}</span>` : ''}
          <span class="dm-datenum">${esc(humanDate(date) || id)}</span>
        </span>
        ${relative ? `<span class="dm-day is-relative">${esc(relative)}</span>` : ''}
        <span class="dm-count">${d.itemCount ?? (d.items ? d.items.length : 0)} položek</span>
      </div>
      <div class="dm-card-actions">
        <button class="btn btn-outline btn-sm dm-edit"><i class="fa-solid fa-pen"></i> Upravit</button>
        <button class="btn btn-outline btn-sm dm-delete"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
    <div class="dm-preview">${itemsPreviewHTML(d.items)}</div>
    ${syncBlockHTML(d.sync)}
  `;
  return card;
}

function wireCardButtons() {
  document.querySelectorAll('.dm-card').forEach((card) => {
    const id = card.dataset.id;
    card.querySelector('.dm-edit')?.addEventListener('click', () => openEditor(id));
    card.querySelector('.dm-delete')?.addEventListener('click', () => deleteDay(id));
  });
}

// ==========================================================================
// EDITOR JEDNOHO DNE
// ==========================================================================

async function openEditor(date) {
  const card = $('dm-editor-card');
  const tbody = $('dm-tbody');

  if (date) {
    editingDate = date;
    $('dm-editor-title').textContent = `Úprava dne ${date}`;
    try {
      const snap = await getDoc(doc(db, MENU_COLLECTION, date));
      const d = snap.exists() ? snap.data() : {};
      $('dm-date').value = d.date || date;
      $('dm-day').value = d.day || '';
      renderRows(tbody, d.items || []);
    } catch (err) {
      toast('Chyba při načítání dne: ' + err.message, 'error');
      return;
    }
  } else {
    editingDate = null;
    $('dm-editor-title').textContent = 'Nový den';
    $('dm-date').value = '';
    $('dm-day').value = '';
    renderRows(tbody, []);
    addEmptyRow(tbody);
  }

  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditor() {
  $('dm-editor-card').style.display = 'none';
  editingDate = null;
}

async function saveDay() {
  const date = $('dm-date').value;
  const day = $('dm-day').value.trim();
  if (!date) {
    toast('Zadejte datum menu.', 'error');
    $('dm-date').focus();
    return;
  }

  const tbody = $('dm-tbody');
  const nameless = markNamelessRows(tbody);
  if (nameless.length) {
    toast('Každá položka musí mít vyplněný název.', 'error');
    nameless[0].focus();
    return;
  }

  const items = readRows(tbody);
  if (items.length === 0) {
    toast('Přidejte alespoň jednu položku.', 'error');
    return;
  }

  const btn = $('dm-save-btn');
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const ref = doc(db, MENU_COLLECTION, date);
    const existing = await getDoc(ref);

    const payload = {
      date,
      day,
      items,
      itemCount: items.length,
      source: existing.exists() ? existing.data().source || 'admin-edit' : 'admin-edit',
      sync: freshSync(Date.now()),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) payload.createdAt = serverTimestamp();

    // Pokud se změnilo datum u existujícího záznamu, starý smažeme.
    if (editingDate && editingDate !== date) {
      await deleteDoc(doc(db, MENU_COLLECTION, editingDate));
    }

    await setDoc(ref, payload, { merge: true });
    toast(`Den ${date} uložen ✔`, 'success');
    closeEditor();
    loadList();
  } catch (err) {
    console.error('Save day error:', err);
    if (String(err.code || '').includes('permission')) {
      toast('Uložení se nezdařilo – chybí oprávnění.', 'error');
    } else {
      toast('Chyba při ukládání: ' + err.message, 'error');
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

async function deleteDay(id) {
  if (!confirm(`Opravdu smazat denní menu ${id}?`)) return;
  try {
    await deleteDoc(doc(db, MENU_COLLECTION, id));
    toast('Denní menu smazáno.', 'success');
    loadList();
  } catch (err) {
    toast('Chyba při mazání: ' + err.message, 'error');
  }
}

// ==========================================================================
// ODPOČET (countdown) do automatického exportu
// ==========================================================================

function tickCountdowns() {
  const now = Date.now();
  document.querySelectorAll('.dm-countdown').forEach((el) => {
    // Odpočet ukazujeme jen dokud den čeká na automatické odeslání.
    if (el.dataset.processed === '1') { el.textContent = ''; el.classList.remove('is-due'); return; }
    const iso = el.dataset.scheduled;
    if (!iso) { el.textContent = ''; return; }
    const target = Date.parse(iso);
    if (Number.isNaN(target)) { el.textContent = ''; return; }
    const diff = target - now;
    if (diff <= 0) { el.textContent = ''; el.classList.remove('is-due'); return; }
    const totalSec = Math.floor(diff / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    el.classList.remove('is-due');
    el.innerHTML = `<i class="fa-solid fa-clock"></i> odešle se za ${mm}:${ss}`;
  });
}

// ==========================================================================
// INICIALIZACE
// ==========================================================================

function init() {
  if (!$('dm-list')) return;

  $('dm-new-btn')?.addEventListener('click', () => openEditor(null));
  $('dm-refresh-btn')?.addEventListener('click', loadList);
  $('dm-cancel-btn')?.addEventListener('click', closeEditor);
  $('dm-save-btn')?.addEventListener('click', saveDay);
  $('dm-add-row-btn')?.addEventListener('click', () => addEmptyRow($('dm-tbody')));

  loadList();
  setInterval(tickCountdowns, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
