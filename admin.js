/* ==========================================================================
   PASÁŽ VELVET - ADMIN PANEL LOGIC
   Firebase Auth + GitHub API Integration
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- GitHub API Configuration ---
const GITHUB_OWNER = 'digifycz-com';
const GITHUB_REPO = 'velvet';
const GITHUB_BRANCH = 'main';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// --- State ---
let currentMenuData = null;
let currentGalleryData = null;
let stagedFiles = []; // Files ready to upload
let editingImageId = null;
let menuDirty = false;
let galleryDirty = false;

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

function generateId() {
  return 'img-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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

async function githubPutBinary(path, base64Data, message, sha = null) {
  const token = getGithubToken();
  if (!token) throw new Error('GitHub token není nastaven');

  const body = {
    message,
    content: base64Data,
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
    throw new Error(err.message || `GitHub upload error: ${res.status}`);
  }

  return res.json();
}

async function githubDelete(path, sha, message) {
  const token = getGithubToken();
  if (!token) throw new Error('GitHub token není nastaven');

  const res = await fetch(`${GITHUB_API_BASE}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      sha,
      branch: GITHUB_BRANCH
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub DELETE error: ${res.status}`);
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

// TEST MODE: login is temporarily disabled so /admin opens directly.
// Set AUTH_ENABLED back to true to require e-mail/password login again.
const AUTH_ENABLED = false;

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
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    loginError.classList.remove('visible');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      let msg = 'Přihlášení selhalo.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Nesprávný e-mail nebo heslo.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Příliš mnoho pokusů. Zkuste to za chvíli.';
      }
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
      document.getElementById('admin-user-email').textContent = user.email;
      initDashboard();
    } else {
      loginScreen.style.display = 'flex';
      dashboard.style.display = 'none';
    }
  });
} else {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  document.getElementById('admin-user-email').textContent = 'testovací režim';
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
  document.getElementById('save-gallery-btn').disabled = !enabled;
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
    await Promise.all([loadMenuData(), loadGalleryData()]);
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

async function loadGalleryData() {
  try {
    const result = await loadJsonFromGithub('data/gallery.json');
    if (result) {
      currentGalleryData = result.data;
      renderGalleryAdmin();
      showToast('Galerie načtena.', 'success');
    } else {
      showToast('Soubor gallery.json nebyl nalezen.', 'error');
    }
  } catch (err) {
    console.error('Error loading gallery:', err);
    try {
      const res = await fetch('/data/gallery.json');
      if (res.ok) {
        currentGalleryData = await res.json();
        renderGalleryAdmin();
        showToast('Galerie načtena (lokálně).', 'info');
      }
    } catch (localErr) {
      showToast('Chyba při načítání galerie.', 'error');
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
  currentMenuData.updatedBy = auth.currentUser?.email || 'admin';

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

// ==========================================================================
// GALLERY MANAGER
// ==========================================================================

function renderGalleryAdmin() {
  if (!currentGalleryData) return;

  const grid = document.getElementById('gallery-admin-grid');
  const emptyState = document.getElementById('gallery-empty');
  const images = currentGalleryData.images || [];

  if (images.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  // Sort by order
  images.sort((a, b) => a.order - b.order);

  grid.innerHTML = images.map(img => `
    <div class="gallery-admin-item" data-id="${img.id}">
      <img src="${img.src}" alt="${escapeHtml(img.alt)}" loading="lazy" />
      <div class="gallery-admin-overlay">
        <span class="gallery-admin-caption">${escapeHtml(img.caption)}</span>
        <div class="gallery-admin-actions">
          <button class="gallery-action-btn edit" data-id="${img.id}" title="Upravit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="gallery-action-btn delete" data-id="${img.id}" title="Smazat">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  grid.querySelectorAll('.gallery-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });

  grid.querySelectorAll('.gallery-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGalleryImage(btn.dataset.id);
    });
  });
}

// --- Upload Zone ---
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

if (uploadZone && fileInput) {
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });
}

function handleFiles(fileList) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const file of fileList) {
    if (!validTypes.includes(file.type)) {
      showToast(`${file.name}: Nepodporovaný formát.`, 'error');
      continue;
    }
    if (file.size > maxSize) {
      showToast(`${file.name}: Příliš velký soubor (max 5 MB).`, 'error');
      continue;
    }
    stagedFiles.push(file);
  }

  renderUploadPreview();
}

function renderUploadPreview() {
  const card = document.getElementById('upload-preview-card');
  const grid = document.getElementById('upload-preview-grid');

  if (stagedFiles.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  grid.innerHTML = '';

  stagedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'upload-preview-item';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'upload-preview-remove';
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeBtn.addEventListener('click', () => {
      stagedFiles.splice(index, 1);
      renderUploadPreview();
    });

    item.appendChild(img);
    item.appendChild(removeBtn);
    grid.appendChild(item);
  });
}

// Cancel upload
document.getElementById('cancel-upload-btn')?.addEventListener('click', () => {
  stagedFiles = [];
  renderUploadPreview();
});

// Confirm upload
document.getElementById('confirm-upload-btn')?.addEventListener('click', async () => {
  if (stagedFiles.length === 0) return;
  if (!getGithubToken()) {
    showToast('Nejprve nastavte GitHub token.', 'error');
    return;
  }

  showLoading(`Nahrávání ${stagedFiles.length} fotografií...`);

  try {
    const maxOrder = currentGalleryData?.images?.length
      ? Math.max(...currentGalleryData.images.map(i => i.order))
      : 0;

    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `gallery_${Date.now()}_${i}.${ext}`;
      const filePath = `public/images/gallery/${fileName}`;

      // Read file as base64
      const base64 = await fileToBase64(file);

      // Upload to GitHub
      await githubPutBinary(filePath, base64, `Přidání fotografie: ${fileName}`);

      // Add to gallery data
      if (!currentGalleryData) {
        currentGalleryData = { lastUpdated: new Date().toISOString(), images: [] };
      }

      currentGalleryData.images.push({
        id: generateId(),
        src: `/images/gallery/${fileName}`,
        alt: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        caption: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        order: maxOrder + i + 1
      });
    }

    // Save updated gallery.json
    currentGalleryData.lastUpdated = new Date().toISOString();
    await saveJsonToGithub('data/gallery.json', currentGalleryData, `Přidání ${stagedFiles.length} fotografií do galerie`);

    showToast(`${stagedFiles.length} fotografií úspěšně nahráno!`, 'success');
    stagedFiles = [];
    renderUploadPreview();
    renderGalleryAdmin();
    galleryDirty = false;
  } catch (err) {
    console.error('Upload error:', err);
    showToast('Chyba při nahrávání: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data:... prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Delete Gallery Image ---
async function deleteGalleryImage(imageId) {
  if (!confirm('Opravdu chcete smazat tuto fotografii?')) return;
  if (!getGithubToken()) {
    showToast('Nejprve nastavte GitHub token.', 'error');
    return;
  }

  const image = currentGalleryData.images.find(i => i.id === imageId);
  if (!image) return;

  showLoading('Mazání fotografie...');

  try {
    // Try to delete the actual image file from GitHub
    const imagePath = image.src.startsWith('/') ? 'public' + image.src : image.src;
    const fileInfo = await githubGet(imagePath);
    if (fileInfo) {
      await githubDelete(imagePath, fileInfo.sha, `Smazání fotografie: ${image.caption}`);
    }

    // Remove from gallery data
    currentGalleryData.images = currentGalleryData.images.filter(i => i.id !== imageId);
    currentGalleryData.lastUpdated = new Date().toISOString();

    // Save updated gallery.json
    await saveJsonToGithub('data/gallery.json', currentGalleryData, `Smazání fotografie: ${image.caption}`);

    showToast('Fotografie smazána.', 'success');
    renderGalleryAdmin();
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Chyba při mazání: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// --- Edit Image Modal ---
const editModal = document.getElementById('edit-image-modal');

function openEditModal(imageId) {
  editingImageId = imageId;
  const image = currentGalleryData.images.find(i => i.id === imageId);
  if (!image) return;

  document.getElementById('edit-modal-img').src = image.src;
  document.getElementById('edit-img-caption').value = image.caption || '';
  document.getElementById('edit-img-alt').value = image.alt || '';
  editModal.style.display = 'flex';
}

function closeEditModal() {
  editModal.style.display = 'none';
  editingImageId = null;
}

document.getElementById('close-edit-modal')?.addEventListener('click', closeEditModal);
document.getElementById('cancel-edit-modal')?.addEventListener('click', closeEditModal);

editModal?.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

document.getElementById('save-edit-modal')?.addEventListener('click', () => {
  if (!editingImageId) return;

  const image = currentGalleryData.images.find(i => i.id === editingImageId);
  if (!image) return;

  image.caption = document.getElementById('edit-img-caption').value.trim();
  image.alt = document.getElementById('edit-img-alt').value.trim();

  renderGalleryAdmin();
  closeEditModal();
  galleryDirty = true;
  showToast('Popisek upraven. Nezapomeňte uložit galerii.', 'info');
});

// Save gallery button
document.getElementById('save-gallery-btn')?.addEventListener('click', async () => {
  if (!currentGalleryData || !getGithubToken()) return;

  currentGalleryData.lastUpdated = new Date().toISOString();

  showLoading('Ukládání galerie...');

  try {
    await saveJsonToGithub('data/gallery.json', currentGalleryData, `Aktualizace galerie – ${new Date().toLocaleDateString('cs-CZ')}`);
    showToast('Galerie úspěšně uložena!', 'success');
    galleryDirty = false;
  } catch (err) {
    console.error('Save gallery error:', err);
    showToast('Chyba při ukládání galerie: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ==========================================================================
// KEYBOARD SHORTCUTS
// ==========================================================================

document.addEventListener('keydown', (e) => {
  // Escape to close modals
  if (e.key === 'Escape') {
    if (editModal.style.display === 'flex') {
      closeEditModal();
    }
  }
});
