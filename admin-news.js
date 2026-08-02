/* ==========================================================================
   PASÁŽ VELVET - SPRÁVA DVOU AKTUALIT
   Obsahuje přesně dvě editovatelné pozice uložené v siteContent/homepage.
   Fotky se nahrávají do Firebase Storage, do Firestore jde jen odkaz.
   ========================================================================== */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC,
} from '/firebase-db.js';
import { uploadImage, deleteImage, formatSavings } from '/firebase-storage.js';

const DEFAULT_NEWS = [
  {
    label: 'Velvet',
    title: 'Letní zahrádka je otevřená',
    text: 'Užijte si oběd nebo večerní posezení v klidném stínu přímo v centru Pardubic.',
    images: [],
  },
  {
    label: 'Rezervace',
    title: 'Oslavy a firemní setkání',
    text: 'Rádi pro vás připravíme rodinnou oslavu, pracovní oběd nebo soukromou akci.',
    images: [],
  },
];

/* Fotky drží stav mimo formulář – v inputech není kam je uložit. */
const photos = [[], []];

// Cesty ke smazání až ve chvíli, kdy se uloží zbytek. Kdyby admin změnu
// zavřel bez uložení, soubor ve Storage zůstane a odkaz na něj taky.
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

function renderPhotos(index) {
  const grid = document.getElementById(`news-${index}-photos`);
  if (!grid) return;

  const list = photos[index];
  if (!list.length) {
    grid.innerHTML = '<p class="admin-empty-hint">Zatím bez fotek.</p>';
    return;
  }

  grid.innerHTML = list.map((img, i) => `
    <figure class="news-photo${i === 0 ? ' is-cover' : ''}">
      <img src="${img.thumbUrl || img.url}" alt="" />
      ${i === 0 ? '<figcaption>Titulní</figcaption>' : ''}
      <div class="news-photo-actions">
        ${i > 0 ? `<button type="button" class="news-photo-btn" data-act="cover" data-i="${i}" title="Nastavit jako titulní"><i class="fa-solid fa-star"></i></button>` : ''}
        <button type="button" class="news-photo-btn danger" data-act="remove" data-i="${i}" title="Odebrat fotku"><i class="fa-solid fa-trash"></i></button>
      </div>
    </figure>
  `).join('');
}

function bindPhotoGrid(index) {
  const grid = document.getElementById(`news-${index}-photos`);
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.news-photo-btn');
    if (!btn) return;
    const i = Number(btn.dataset.i);

    if (btn.dataset.act === 'remove') {
      const [removed] = photos[index].splice(i, 1);
      // Smazat ze Storage až při uložení – zrušená editace nesmí přijít o data.
      if (removed?.path) pendingDeletions.push(removed.path);
      if (removed?.thumbPath) pendingDeletions.push(removed.thumbPath);
    } else if (btn.dataset.act === 'cover') {
      const [moved] = photos[index].splice(i, 1);
      photos[index].unshift(moved);
    }
    renderPhotos(index);
  });
}

async function handleFiles(index, input) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;

  const label = input.closest('.file-btn');
  label?.classList.add('loading');
  try {
    const nove = [];
    for (const file of files) {
      // Postupně, ne paralelně – u fotek z telefonu je převod náročný
      // a naráz by to na slabším notebooku zamrzlo.
      // eslint-disable-next-line no-await-in-loop
      const img = await uploadImage(file, 'news', { thumb: true });
      photos[index].push(img);
      nove.push(img);
      renderPhotos(index);
    }
    toast(
      `Nahráno ${files.length} ${files.length === 1 ? 'foto' : 'fotek'} `
      + `(${formatSavings(nove)}). Nezapomeňte uložit.`,
      'success',
    );
  } catch (err) {
    toast('Nahrání se nepodařilo: ' + err.message, 'error');
  } finally {
    label?.classList.remove('loading');
  }
}

function fillForm(news) {
  for (let i = 0; i < 2; i += 1) {
    const item = news[i] || DEFAULT_NEWS[i];
    document.getElementById(`news-${i}-label`).value = item.label || '';
    document.getElementById(`news-${i}-title`).value = item.title || '';
    document.getElementById(`news-${i}-text`).value = item.text || '';
    photos[i] = Array.isArray(item.images)
      ? item.images.filter((img) => img && img.url)
      : [];
    renderPhotos(i);
  }
}

function readForm() {
  return [0, 1].map((i) => ({
    label: document.getElementById(`news-${i}-label`).value.trim(),
    title: document.getElementById(`news-${i}-title`).value.trim(),
    text: document.getElementById(`news-${i}-text`).value.trim(),
    images: photos[i],
  }));
}

async function loadNews() {
  try {
    const ref = doc(db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC);
    const snap = await getDoc(ref);
    const news = snap.exists() && Array.isArray(snap.data().news)
      ? snap.data().news
      : DEFAULT_NEWS;
    fillForm(news);
  } catch (err) {
    fillForm(DEFAULT_NEWS);
    toast('Aktuality se nepodařilo načíst: ' + err.message, 'error');
  }
}

async function saveNews() {
  const news = readForm();
  if (news.some((item) => !item.title || !item.text)) {
    toast('Obě dlaždice musí mít vyplněný nadpis a text.', 'error');
    return;
  }

  const button = document.getElementById('news-save-btn');
  button.disabled = true;
  button.classList.add('loading');
  try {
    const ref = doc(db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC);
    await setDoc(ref, { news, updatedAt: serverTimestamp() }, { merge: true });

    // Teprve po úspěšném zápisu uklidíme odebrané soubory.
    await Promise.all(pendingDeletions.splice(0).map(deleteImage));
    toast('Aktuality byly uloženy.', 'success');
  } catch (err) {
    toast('Aktuality se nepodařilo uložit: ' + err.message, 'error');
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function init() {
  if (!document.getElementById('news-manager')) return;
  document.getElementById('news-save-btn')?.addEventListener('click', saveNews);

  for (let i = 0; i < 2; i += 1) {
    bindPhotoGrid(i);
    document.getElementById(`news-${i}-file`)
      ?.addEventListener('change', (e) => handleFiles(i, e.target));
  }

  loadNews();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
