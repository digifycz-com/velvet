/* ==========================================================================
   PASÁŽ VELVET - Sdílená editovatelná tabulka položek menu
   Používá import (vložení z Excelu) i editor jednotlivého dne.
   ========================================================================== */

import { CATEGORIES } from '/menu-parser.js';
import { SYNC_PLATFORMS, AUTO_SYNC_MINUTES } from '/firebase-db.js';

// Pořadí kategorií v <select> a při zobrazení.
export const CATEGORY_ORDER = ['polevka', 'predkrm', 'salat', 'hlavni', 'priloha', 'dezert', 'napoj'];

// Ikony kategorií (FontAwesome) pro veřejné zobrazení.
export const CATEGORY_ICONS = {
  polevka: 'fa-bowl-food',
  predkrm: 'fa-cheese',
  salat: 'fa-leaf',
  hlavni: 'fa-utensils',
  priloha: 'fa-bowl-rice',
  dezert: 'fa-ice-cream',
  napoj: 'fa-mug-hot',
};

export function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

export function intOrNull(v) {
  const s = String(v ?? '').replace(/[^\d]/g, '');
  return s === '' ? null : parseInt(s, 10);
}

// --- Editovatelná tabulka ---------------------------------------------------

export function categorySelectHTML(selected) {
  const opts = CATEGORY_ORDER.map((key) => {
    const sel = key === selected ? ' selected' : '';
    return `<option value="${key}"${sel}>${esc(CATEGORIES[key])}</option>`;
  }).join('');
  return `<select class="imp-cat">${opts}</select>`;
}

export function rowHTML(item = {}) {
  return `
    <tr data-dateraw="${esc(item.dateRaw || '')}">
      <td class="col-cat">${categorySelectHTML(item.category || 'hlavni')}</td>
      <td class="col-num"><input type="text" class="imp-num" value="${esc(item.number ?? '')}" inputmode="numeric" /></td>
      <td class="col-name"><input type="text" class="imp-name" value="${esc(item.name || '')}" placeholder="Název jídla..." /></td>
      <td class="col-desc"><input type="text" class="imp-desc" value="${esc(item.description || '')}" placeholder="Popis..." /></td>
      <td class="col-price"><input type="text" class="imp-price" value="${esc(item.price ?? '')}" inputmode="numeric" placeholder="0" /></td>
      <td class="col-foodora"><input type="text" class="imp-foodora" value="${esc(item.foodora ?? '')}" inputmode="numeric" placeholder="–" /></td>
      <td class="col-actions"><button type="button" class="imp-row-remove" title="Odstranit řádek"><i class="fa-solid fa-trash-can"></i></button></td>
    </tr>`;
}

export function wireRemoveButtons(tbody, onChange) {
  tbody.querySelectorAll('.imp-row-remove').forEach((btn) => {
    btn.onclick = () => {
      btn.closest('tr').remove();
      if (onChange) onChange();
    };
  });
}

export function renderRows(tbody, items, onChange) {
  tbody.innerHTML = (items || []).map(rowHTML).join('');
  wireRemoveButtons(tbody, onChange);
  if (onChange) onChange();
}

export function addEmptyRow(tbody, onChange) {
  tbody.insertAdjacentHTML('beforeend', rowHTML({ category: 'hlavni' }));
  wireRemoveButtons(tbody, onChange);
  if (onChange) onChange();
  tbody.lastElementChild?.querySelector('.imp-name')?.focus();
}

export function readRows(tbody) {
  return Array.from(tbody.querySelectorAll('tr')).map((tr) => {
    const category = tr.querySelector('.imp-cat').value;
    return {
      category,
      categoryLabel: CATEGORIES[category] || category,
      number: intOrNull(tr.querySelector('.imp-num').value),
      name: tr.querySelector('.imp-name').value.trim(),
      description: tr.querySelector('.imp-desc').value.trim(),
      price: intOrNull(tr.querySelector('.imp-price').value),
      foodora: intOrNull(tr.querySelector('.imp-foodora').value),
      dateRaw: tr.dataset.dateraw || '',
    };
  });
}

// Prázdný přidaný řádek je stále položka: před uložením se musí pojmenovat
// nebo odstranit. Vrací vstupy bez názvu a zároveň je vizuálně označí.
export function markNamelessRows(tbody) {
  const inputs = Array.from(tbody.querySelectorAll('.imp-name'));
  const invalid = inputs.filter((input) => !input.value.trim());

  inputs.forEach((input) => {
    input.classList.toggle('is-invalid', invalid.includes(input));
    if (!input.dataset.nameValidationWired) {
      input.dataset.nameValidationWired = '1';
      input.addEventListener('input', () => {
        if (input.value.trim()) input.classList.remove('is-invalid');
      });
    }
  });

  return invalid;
}

// --- Synchronizace na platformy (Foodora / Wolt / Menicka) ------------------

/**
 * Vytvoří čerstvý sync stav: naplánuje odeslání za AUTO_SYNC_MINUTES minut
 * a všem platformám nastaví stav "pending".
 * @param {number} nowMs  Date.now() z volajícího (modul zůstává bez Date).
 */
export function freshSync(nowMs) {
  const scheduledFor = new Date(nowMs + AUTO_SYNC_MINUTES * 60 * 1000).toISOString();
  const platforms = {};
  for (const p of SYNC_PLATFORMS) {
    platforms[p] = { status: 'pending', at: null, message: '' };
  }
  return { scheduledFor, requestedAt: new Date(nowMs).toISOString(), platforms };
}

// Popisky stavů + barevná třída.
export const SYNC_STATUS = {
  pending: { label: 'čeká', cls: 'is-pending', icon: 'fa-clock' },
  queued: { label: 'připravuje se', cls: 'is-queued', icon: 'fa-hourglass-half' },
  uploading: { label: 'odesílá se', cls: 'is-uploading', icon: 'fa-spinner fa-spin' },
  uploaded: { label: 'odesláno', cls: 'is-uploaded', icon: 'fa-circle-check' },
  failed: { label: 'chyba', cls: 'is-failed', icon: 'fa-circle-exclamation' },
  disabled: { label: 'zatím nenastaveno', cls: 'is-disabled', icon: 'fa-circle-minus' },
};
