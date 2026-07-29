/* ==========================================================================
   PASÁŽ VELVET - ADMIN PANEL LOGIC
   Firebase Auth + GitHub API Integration
   ========================================================================== */

import {
  initializeApp, getApps, getApp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth, signInWithCustomToken, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getFunctions, httpsCallable,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDrgntp8csj1eBlGKoVqDHfoRjpJ_W35fI",
  authDomain: "velvet-cz.firebaseapp.com",
  projectId: "velvet-cz",
  storageBucket: "velvet-cz.firebasestorage.app",
  messagingSenderId: "102894275372",
  appId: "1:102894275372:web:b5036d8aa51820909c3a89",
  measurementId: "G-YBX1QC01CP"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'europe-west1');
const adminPasswordLogin = httpsCallable(functions, 'adminPasswordLogin');

// --- GitHub API Configuration ---
const GITHUB_OWNER = 'digifycz-com';
const GITHUB_REPO = 'velvet';
const GITHUB_BRANCH = 'main';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// --- State ---
let currentMenuData = null;
let menuDirty = false;

// ==========================================================================
// UTILITIES
// ==========================================================================

function getGithubToken() {
  return localStorage.getItem('velvet_github_token');
}

function setGithubToken(token) {
  localStorage.setItem('velvet_github_token', token);
}

function clearGithubToken() {
  localStorage.removeItem('velvet_github_token');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(message = 'Načítání...') {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `<div class="spinner-ring"></div><p>${message}</p>`;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}


// ==========================================================================
// GITHUB API
// ==========================================================================

async function githubGet(path) {
  const token = getGithubToken();
  if (!token) throw new Error('GitHub token není nastaven');

  const res = await fetch(`${GITHUB_API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.json();
}

async function githubPut(path, content, message, sha = null) {
  const token = getGithubToken();
  if (!token) throw new Error('GitHub token není nastaven');

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: GITHUB_BRANCH
  };

  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API_BASE}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub PUT error: ${res.status}`);
  }

  return res.json();
}

async function loadJsonFromGithub(path) {
  const file = await githubGet(path);
  if (!file) return null;
  const content = decodeURIComponent(escape(atob(file.content)));
  return { data: JSON.parse(content), sha: file.sha };
}

async function saveJsonToGithub(path, data, message) {
  const existing = await githubGet(path);
  const sha = existing ? existing.sha : null;
  const content = JSON.stringify(data, null, 2);
  return githubPut(path, content, message, sha);
}

// ==========================================================================
// AUTHENTICATION
// ==========================================================================

// Přístup do administrace ověřuje serverová Firebase funkce pouze heslem.
const AUTH_ENABLED = true;

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const passwordToggle = document.getElementById('password-toggle');

// Password toggle
if (passwordToggle) {
  passwordToggle.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const icon = passwordToggle.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
}

// Login form
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    loginError.classList.remove('visible');

    try {
      const response = await adminPasswordLogin({ password });
      const token = response?.data?.token;
      if (!token) throw new Error('Chybí přihlašovací token.');
      await signInWithCustomToken(auth, token);
      document.getElementById('login-password').value = '';
    } catch (err) {
      const code = String(err.code || '');
      let msg = 'Přihlášení selhalo. Zkuste to znovu.';
      if (code.includes('unauthenticated')) msg = 'Nesprávné heslo.';
      if (code.includes('resource-exhausted')) msg = 'Příliš mnoho pokusů. Zkuste to za 15 minut.';
      loginError.textContent = msg;
      loginError.classList.add('visible');
    } finally {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth);
  });
}

// Auth state observer
if (AUTH_ENABLED) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';
      // Přihlašuje se heslem pod jedním společným účtem (ADMIN_UID), takže
      // e-mail z Auth záznamu neříká, kdo je právě přihlášený – neukazujeme ho.
      document.getElementById('admin-user-email').textContent = 'administrátor';
      initDashboard();
    } else {
      loginScreen.style.display = 'flex';
      dashboard.style.display = 'none';
    }
  });
} else {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  document.getElementById('admin-user-email').textContent = 'administrátor';
  if (logoutBtn) logoutBtn.style.display = 'none';
  initDashboard();
}

// ==========================================================================
// DASHBOARD INIT
// ==========================================================================

function initDashboard() {
  // Saving requires a GitHub token in localStorage ('velvet_github_token')
  enableSaveButtons(Boolean(getGithubToken()));

  // Setup tabs
  setupTabs();

  // If token exists, load data
  if (getGithubToken()) {
    loadAllData();
  }
}

function enableSaveButtons(enabled) {
  document.getElementById('save-menu-btn').disabled = !enabled;
}

// ==========================================================================
// TABS
// ==========================================================================

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const sections = document.querySelectorAll('.admin-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ==========================================================================
// LOAD DATA
// ==========================================================================

async function loadAllData() {
  try {
    await loadMenuData();
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Chyba při načítání dat: ' + err.message, 'error');
  }
}

async function loadMenuData() {
  try {
    const result = await loadJsonFromGithub('data/menu.json');
    if (result) {
      currentMenuData = result.data;
      renderMenuEditor();
      showToast('Menu načteno.', 'success');
    } else {
      showToast('Soubor menu.json nebyl nalezen.', 'error');
    }
  } catch (err) {
    console.error('Error loading menu:', err);
    // Try loading locally as fallback
    try {
      const res = await fetch('/data/menu.json');
      if (res.ok) {
        currentMenuData = await res.json();
        renderMenuEditor();
        showToast('Menu načteno (lokálně).', 'info');
      }
    } catch (localErr) {
      showToast('Chyba při načítání menu.', 'error');
    }
  }
}

// ==========================================================================
// MENU EDITOR
// ==========================================================================

function renderMenuEditor() {
  if (!currentMenuData) return;

  document.getElementById('soup-name').value = currentMenuData.soup?.name || '';
  document.getElementById('soup-price').value = currentMenuData.soup?.price || '';
  document.getElementById('soup-desc').value = currentMenuData.soup?.description || '';
  document.getElementById('menu-note').value = currentMenuData.note || '';

  const container = document.getElementById('dishes-container');
  container.innerHTML = '';

  (currentMenuData.dishes || []).forEach((dish, index) => {
    container.appendChild(createDishElement(dish, index));
  });

  // Track changes
  setupMenuChangeTracking();
}

function createDishElement(dish, index) {
  const div = document.createElement('div');
  div.className = 'dish-item';
  div.dataset.index = index;
  div.innerHTML = `
    <div class="dish-item-header">
      <span class="dish-number"><span>${index + 1}</span> Hlavní chod</span>
      <button class="dish-remove-btn" data-index="${index}">
        <i class="fa-solid fa-trash-can"></i> Odstranit
      </button>
    </div>
    <div class="editor-row">
      <div class="admin-form-group flex-grow">
        <label>Název jídla</label>
        <input type="text" class="dish-name" value="${escapeHtml(dish.name || '')}" placeholder="Název jídla..." />
      </div>
      <div class="admin-form-group w-120">
        <label>Cena (Kč)</label>
        <input type="number" class="dish-price" value="${dish.price || ''}" min="0" placeholder="0" />
      </div>
    </div>
    <div class="admin-form-group">
      <label>Popis</label>
      <input type="text" class="dish-desc" value="${escapeHtml(dish.description || '')}" placeholder="Popis jídla..." />
    </div>
  `;

  // Remove button handler
  div.querySelector('.dish-remove-btn').addEventListener('click', () => {
    if (currentMenuData.dishes.length <= 1) {
      showToast('Musí být alespoň jeden hlavní chod.', 'error');
      return;
    }
    currentMenuData.dishes.splice(index, 1);
    renderMenuEditor();
    menuDirty = true;
  });

  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setupMenuChangeTracking() {
  const inputs = document.querySelectorAll('#menu-editor input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      menuDirty = true;
    });
  });
}

// Add dish button
document.getElementById('add-dish-btn')?.addEventListener('click', () => {
  if (!currentMenuData) return;
  if (currentMenuData.dishes.length >= 8) {
    showToast('Maximum je 8 hlavních chodů.', 'error');
    return;
  }
  currentMenuData.dishes.push({
    id: currentMenuData.dishes.length + 1,
    name: '',
    description: '',
    price: 0
  });
  renderMenuEditor();
  menuDirty = true;
  
  // Scroll to the new dish
  const container = document.getElementById('dishes-container');
  const lastDish = container.lastElementChild;
  if (lastDish) {
    lastDish.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lastDish.querySelector('.dish-name')?.focus();
  }
});

// Save menu button
document.getElementById('save-menu-btn')?.addEventListener('click', async () => {
  if (!currentMenuData || !getGithubToken()) return;

  // Collect form data
  currentMenuData.soup = {
    name: document.getElementById('soup-name').value.trim(),
    description: document.getElementById('soup-desc').value.trim(),
    price: parseInt(document.getElementById('soup-price').value) || 0
  };

  currentMenuData.note = document.getElementById('menu-note').value.trim();

  // Collect dishes
  const dishItems = document.querySelectorAll('.dish-item');
  currentMenuData.dishes = Array.from(dishItems).map((item, i) => ({
    id: i + 1,
    name: item.querySelector('.dish-name').value.trim(),
    description: item.querySelector('.dish-desc').value.trim(),
    price: parseInt(item.querySelector('.dish-price').value) || 0
  }));

  currentMenuData.lastUpdated = new Date().toISOString();
  // Společný účet, takže e-mail nikoho neidentifikuje – navíc by se zapsal
  // do menu.json ve veřejném repozitáři.
  currentMenuData.updatedBy = 'admin';

  showLoading('Ukládání menu...');

  try {
    await saveJsonToGithub('data/menu.json', currentMenuData, `Aktualizace poledního menu – ${new Date().toLocaleDateString('cs-CZ')}`);
    showToast('Menu úspěšně uloženo!', 'success');
    menuDirty = false;
  } catch (err) {
    console.error('Save menu error:', err);
    showToast('Chyba při ukládání menu: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

