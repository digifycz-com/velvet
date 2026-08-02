/* ==========================================================================
   PASÁŽ VELVET – SPRÁVA FOTOGALERIE
   Galerie je rozdělená na kategorie jídel, jedna kategorie = jedna dlaždice
   na webu. Fotky jdou do Firebase Storage, do Firestore se ukládají odkazy.
   ========================================================================== */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { db, SITE_CONTENT_COLLECTION } from '/firebase-db.js';
import { esc } from '/menu-table.js';
import { uploadImage, deleteImage, formatSavings } from '/firebase-storage.js';
import { DEFAULT_GALLERY, GALLERY_DOC } from '/gallery-data.js';

let categories = [];

// Cesty ke smazání až při uložení – zavřená editace nesmí přijít o fotky.
const pendingDeletions = [];

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
  el.innerHTML = `<i class="${icons[type]}"></i><span></span>`;
  el.querySelector('span').textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

/* Slug slouží jen jako stabilní id kategorie, na webu se nezobrazuje. */
function slugify(title) {
  const base = title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `kategorie-${categories.length + 1}`;
}

function categoryHTML(cat, index) {
  const photos = cat.photos.map((photo, i) => `
    <figure class="gallery-photo${i === 0 ? ' is-cover' : ''}">
      <img src="${esc(photo.thumbUrl || photo.url)}" alt="" />
      ${i === 0 ? '<figcaption>Titulní</figcaption>' : ''}
      <div class="gallery-photo-actions">
        ${i > 0 ? `<button type="button" class="gallery-photo-btn" data-act="cover" data-i="${i}" title="Nastavit jako titulní"><i class="fa-solid fa-star"></i></button>` : ''}
        <button type="button" class="gallery-photo-btn danger" data-act="remove-photo" data-i="${i}" title="Smazat fotku"><i class="fa-solid fa-trash"></i></button>
      </div>
    </figure>
  `).join('');

  return `
    <div class="editor-card gallery-category" data-index="${index}">
      <div class="gallery-category-head">
        <div class="admin-form-group gallery-category-title">
          <label for="gal-title-${index}">Název kategorie</label>
          <input type="text" id="gal-title-${index}" class="gal-title" maxlength="60"
                 value="${esc(cat.title)}" placeholder="Např. Chuťovky k pivu" />
        </div>
        <div class="gallery-category-tools">
          <button type="button" class="btn btn-outline btn-sm" data-act="up" ${index === 0 ? 'disabled' : ''} title="Posunout nahoru">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button type="button" class="btn btn-outline btn-sm" data-act="down" ${index === categories.length - 1 ? 'disabled' : ''} title="Posunout dolů">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button type="button" class="btn btn-outline btn-sm btn-danger" data-act="remove-category" title="Smazat kategorii">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <p class="admin-hint">${cat.photos.length} ${cat.photos.length === 1 ? 'fotka' : 'fotek'} · první je titulní a zobrazí se na dlaždici.</p>
      <div class="gallery-photo-grid">
        ${photos || '<p class="admin-empty-hint">Zatím bez fotek.</p>'}
      </div>
      <label class="btn btn-outline btn-sm file-btn">
        <i class="fa-solid fa-image"></i> Přidat fotky
        <input type="file" class="gal-file" accept="image/*" multiple hidden />
      </label>
    </div>`;
}

function render() {
  const wrap = document.getElementById('gallery-categories');
  if (!wrap) return;

  wrap.innerHTML = categories.length
    ? categories.map(categoryHTML).join('')
    : '<p class="admin-empty-hint">Zatím tu není žádná kategorie. Přidejte první tlačítkem nahoře.</p>';
}

/* Názvy se čtou z inputů, ne z pole – uživatel je mohl přepsat bez uložení. */
function syncTitlesFromInputs() {
  document.querySelectorAll('.gallery-category').forEach((el) => {
    const index = Number(el.dataset.index);
    const input = el.querySelector('.gal-title');
    if (categories[index] && input) categories[index].title = input.value.trim();
  });
}

function dropPhoto(photo) {
  if (photo?.path) pendingDeletions.push(photo.path);
  if (photo?.thumbPath) pendingDeletions.push(photo.thumbPath);
}

async function handleFiles(index, input) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;

  syncTitlesFromInputs();
  const label = input.closest('.file-btn');
  label?.classList.add('loading');
  try {
    const nove = [];
    for (const file of files) {
      // Postupně – převod velkých fotek je náročný a naráz by to zamrzlo.
      // eslint-disable-next-line no-await-in-loop
      const img = await uploadImage(file, 'gallery', { thumb: true });
      categories[index].photos.push(img);
      nove.push(img);
    }
    render();
    toast(
      `Nahráno ${files.length} ${files.length === 1 ? 'foto' : 'fotek'} `
      + `(${formatSavings(nove)}). Nezapomeňte uložit.`,
      'success',
    );
  } catch (err) {
    render();
    toast('Nahrání se nepodařilo: ' + err.message, 'error');
  } finally {
    label?.classList.remove('loading');
  }
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const card = btn.closest('.gallery-category');
  if (!card) return;

  const index = Number(card.dataset.index);
  const cat = categories[index];
  if (!cat) return;

  syncTitlesFromInputs();

  switch (btn.dataset.act) {
    case 'remove-photo': {
      const [removed] = cat.photos.splice(Number(btn.dataset.i), 1);
      dropPhoto(removed);
      break;
    }
    case 'cover': {
      const [moved] = cat.photos.splice(Number(btn.dataset.i), 1);
      cat.photos.unshift(moved);
      break;
    }
    case 'remove-category': {
      if (!window.confirm(`Smazat kategorii „${cat.title}" i s ${cat.photos.length} fotkami?`)) return;
      cat.photos.forEach(dropPhoto);
      categories.splice(index, 1);
      break;
    }
    case 'up':
      categories.splice(index - 1, 0, categories.splice(index, 1)[0]);
      break;
    case 'down':
      categories.splice(index + 1, 0, categories.splice(index, 1)[0]);
      break;
    default:
      return;
  }

  render();
}

function addCategory() {
  syncTitlesFromInputs();
  categories.push({ id: `kategorie-${Date.now()}`, title: '', photos: [] });
  render();
  // Rovnou kurzor do názvu, ať se dá hned psát.
  document.querySelector('.gallery-category:last-child .gal-title')?.focus();
}

async function load() {
  try {
    const snap = await getDoc(doc(db, SITE_CONTENT_COLLECTION, GALLERY_DOC));
    const saved = snap.exists() ? snap.data().categories : null;
    categories = Array.isArray(saved) && saved.length
      ? saved.map((c) => ({
        id: c.id || slugify(c.title || ''),
        title: c.title || '',
        photos: Array.isArray(c.photos) ? c.photos.filter((p) => p && p.url) : [],
      }))
      : structuredClone(DEFAULT_GALLERY);
    render();
  } catch (err) {
    categories = structuredClone(DEFAULT_GALLERY);
    render();
    toast('Galerii se nepodařilo načíst: ' + err.message, 'error');
  }
}

async function save() {
  syncTitlesFromInputs();

  if (categories.some((c) => !c.title)) {
    toast('Každá kategorie musí mít název.', 'error');
    return;
  }
  if (categories.some((c) => !c.photos.length)) {
    toast('Kategorie bez fotek by se na webu nezobrazila. Přidejte fotku, nebo kategorii smažte.', 'error');
    return;
  }

  const payload = categories.map((c) => ({
    id: c.id || slugify(c.title),
    title: c.title,
    photos: c.photos,
  }));

  const button = document.getElementById('gallery-save-btn');
  button.disabled = true;
  button.classList.add('loading');
  try {
    await setDoc(
      doc(db, SITE_CONTENT_COLLECTION, GALLERY_DOC),
      { categories: payload, updatedAt: serverTimestamp() },
      { merge: true },
    );
    // Uklidit odebrané soubory až po úspěšném zápisu.
    await Promise.all(pendingDeletions.splice(0).map(deleteImage));
    toast('Galerie byla uložena.', 'success');
  } catch (err) {
    toast('Galerii se nepodařilo uložit: ' + err.message, 'error');
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function init() {
  const wrap = document.getElementById('gallery-categories');
  if (!wrap) return;

  wrap.addEventListener('click', onClick);
  wrap.addEventListener('change', (e) => {
    const input = e.target.closest('.gal-file');
    if (!input) return;
    handleFiles(Number(input.closest('.gallery-category').dataset.index), input);
  });

  document.getElementById('gallery-add-category-btn')?.addEventListener('click', addCategory);
  document.getElementById('gallery-save-btn')?.addEventListener('click', save);

  load();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
