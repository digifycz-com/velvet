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
// SEZNAM DNŮ
// ==========================================================================

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

    list.innerHTML = '';
    snap.forEach((docSnap) => {
      list.appendChild(renderCard(docSnap.id, docSnap.data()));
    });
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

function renderCard(id, d) {
  const card = document.createElement('div');
  card.className = 'dm-card';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="dm-card-head">
      <div class="dm-card-title">
        <span class="dm-date"><i class="fa-regular fa-calendar"></i> ${esc(d.date || id)}</span>
        ${d.day ? `<span class="dm-day">${esc(d.day)}</span>` : ''}
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
