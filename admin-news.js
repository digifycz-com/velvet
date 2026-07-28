/* ==========================================================================
   PASÁŽ VELVET - SPRÁVA DVOU AKTUALIT
   Obsahuje přesně dvě editovatelné pozice uložené v siteContent/homepage.
   ========================================================================== */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  db, SITE_CONTENT_COLLECTION, HOMEPAGE_CONTENT_DOC,
} from '/firebase-db.js';

const DEFAULT_NEWS = [
  {
    label: 'Velvet',
    title: 'Letní zahrádka je otevřená',
    text: 'Užijte si oběd nebo večerní posezení v klidném stínu přímo v centru Pardubic.',
  },
  {
    label: 'Rezervace',
    title: 'Oslavy a firemní setkání',
    text: 'Rádi pro vás připravíme rodinnou oslavu, pracovní oběd nebo soukromou akci.',
  },
];

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

function fillForm(news) {
  for (let i = 0; i < 2; i += 1) {
    const item = news[i] || DEFAULT_NEWS[i];
    document.getElementById(`news-${i}-label`).value = item.label || '';
    document.getElementById(`news-${i}-title`).value = item.title || '';
    document.getElementById(`news-${i}-text`).value = item.text || '';
  }
}

function readForm() {
  return [0, 1].map((i) => ({
    label: document.getElementById(`news-${i}-label`).value.trim(),
    title: document.getElementById(`news-${i}-title`).value.trim(),
    text: document.getElementById(`news-${i}-text`).value.trim(),
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
  loadNews();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
