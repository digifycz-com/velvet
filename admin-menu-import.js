/* ==========================================================================
   PASÁŽ VELVET - IMPORT MENU Z EXCELU  →  FIRESTORE
   Vloží se buňky z Excelu, parser rozpozná položky (i více dnů najednou),
   uživatel je upraví v náhledu a uloží – KAŽDÝ DEN jako samostatný dokument
   ve Firestore (kolekce "dailyMenus", id = datum).
   ========================================================================== */

import {
  doc, setDoc, getDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

import { db, MENU_COLLECTION } from '/firebase-db.js';
import { parseMenuPaste } from '/menu-parser.js';
import { renderRows, addEmptyRow, readRows, freshSync } from '/menu-table.js';
import { notifyMenusChanged } from '/admin-daily-menus.js';

function $(id) {
  return document.getElementById(id);
}

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

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

// ==========================================================================
// NÁHLED – jeden blok na každý den
// ==========================================================================

function dayBlockHTML(dateISO, day) {
  return `
    <div class="import-day-block">
      <div class="import-day-head">
        <div class="admin-form-group w-160">
          <label><i class="fa-regular fa-calendar"></i> Datum menu</label>
          <input type="date" class="import-day-date" value="${esc(dateISO || '')}" />
        </div>
        <div class="admin-form-group w-160">
          <label>Den</label>
          <input type="text" class="import-day-day" value="${esc(day || '')}" placeholder="Pondělí" />
        </div>
        <div class="import-day-actions">
          <span class="import-day-count"></span>
          <button type="button" class="btn btn-outline btn-sm import-day-addrow">
            <i class="fa-solid fa-plus"></i> Řádek
          </button>
        </div>
      </div>
      <div class="import-table-wrap">
        <table class="import-table">
          <thead>
            <tr>
              <th class="col-cat">Kategorie</th>
              <th class="col-num">#</th>
              <th class="col-name">Název</th>
              <th class="col-desc">Popis</th>
              <th class="col-price">Cena</th>
              <th class="col-foodora" title="Extra data pro Foodoru">Foodora</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody class="import-day-tbody"></tbody>
        </table>
      </div>
    </div>`;
}

function updateBlockCount(block) {
  const n = block.querySelectorAll('.import-day-tbody tr').length;
  const el = block.querySelector('.import-day-count');
  if (el) el.textContent = `${n} položek`;
  updateTotalCount();
}

function updateTotalCount() {
  const n = document.querySelectorAll('#import-days .import-day-tbody tr').length;
  const blocks = document.querySelectorAll('#import-days .import-day-block').length;
  const el = $('import-count');
  if (el) el.textContent = n ? `${blocks} ${blocks === 1 ? 'den' : 'dnů'} · ${n} položek celkem` : 'Žádné položky';
}

function renderWarnings(warnings) {
  const box = $('import-warnings');
  if (!box) return;
  if (!warnings || warnings.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = warnings
    .map((w) => `<div class="import-warning"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(w)}</div>`)
    .join('');
}

function handleParse() {
  const text = $('import-paste').value;
  if (!text.trim()) {
    toast('Nejprve vložte data z Excelu.', 'error');
    return;
  }

  const res = parseMenuPaste(text, { defaultYear: new Date().getFullYear() });
  renderWarnings(res.warnings);

  const container = $('import-days');
  container.innerHTML = res.days
    .map((d) => dayBlockHTML(d.dateISO, d.day))
    .join('');

  const blocks = container.querySelectorAll('.import-day-block');
  blocks.forEach((block, i) => {
    const tbody = block.querySelector('.import-day-tbody');
    renderRows(tbody, res.days[i].items, () => updateBlockCount(block));
    block.querySelector('.import-day-addrow')
      .addEventListener('click', () => addEmptyRow(tbody, () => updateBlockCount(block)));
    updateBlockCount(block);
  });

  const summary = $('import-days-summary');
  if (summary) {
    const dn = res.days.length;
    summary.textContent = `${dn} ${dn === 1 ? 'den' : (dn >= 2 && dn <= 4 ? 'dny' : 'dnů')} · ${res.items.length} položek`;
  }

  $('import-preview-card').style.display = 'block';
  $('import-preview-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  toast(`Rozpoznáno ${res.days.length} dnů, ${res.items.length} položek.`, 'success');
}

// ==========================================================================
// ULOŽENÍ – každý den jako samostatný dokument
// ==========================================================================

async function handleSave() {
  const blocks = Array.from(document.querySelectorAll('#import-days .import-day-block'));

  const days = [];
  const missingDate = [];
  for (const block of blocks) {
    const date = block.querySelector('.import-day-date').value;
    const day = block.querySelector('.import-day-day').value.trim();
    const items = readRows(block.querySelector('.import-day-tbody'));
    if (items.length === 0) continue;
    if (!date) { missingDate.push(day || '(bez názvu)'); continue; }
    days.push({ date, day, items });
  }

  if (missingDate.length > 0) {
    toast(`Doplňte datum u dnů: ${missingDate.join(', ')}.`, 'error');
    return;
  }
  if (days.length === 0) {
    toast('Žádné dny k uložení.', 'error');
    return;
  }

  const saveBtn = $('import-save-btn');
  saveBtn.disabled = true;
  saveBtn.classList.add('loading');

  let saved = 0;
  try {
    for (const d of days) {
      const ref = doc(db, MENU_COLLECTION, d.date);
      const existing = await getDoc(ref);
      const payload = {
        date: d.date,
        day: d.day,
        items: d.items,
        itemCount: d.items.length,
        source: 'excel-import',
        sync: freshSync(Date.now()),
        updatedAt: serverTimestamp(),
      };
      if (!existing.exists()) payload.createdAt = serverTimestamp();
      await setDoc(ref, payload, { merge: true });
      saved += 1;
    }

    toast(`Uloženo ${saved} ${saved === 1 ? 'den' : 'dnů'} ✔`, 'success');
    notifyMenusChanged();
  } catch (err) {
    console.error('Save error:', err);
    if (String(err.code || '').includes('permission')) {
      toast('Uložení se nezdařilo – chybí oprávnění.', 'error');
    } else {
      toast(`Chyba při ukládání (uloženo ${saved}/${days.length}): ${err.message}`, 'error');
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
}

// ==========================================================================
// INICIALIZACE
// ==========================================================================

function init() {
  const parseBtn = $('import-parse-btn');
  if (!parseBtn) return;

  parseBtn.addEventListener('click', handleParse);
  $('import-clear-btn')?.addEventListener('click', () => {
    $('import-paste').value = '';
    $('import-paste').focus();
  });
  $('import-save-btn')?.addEventListener('click', handleSave);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
