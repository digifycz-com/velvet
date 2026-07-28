/* ==========================================================================
   PASÁŽ VELVET – ADMIN STÁLÉHO A NÁPOJOVÉHO MENU
   Obě menu jsou strukturovaná po kategoriích a ukládají se do Firestore.
   ========================================================================== */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { db, SITE_CONTENT_COLLECTION } from '/firebase-db.js';
import { esc } from '/menu-table.js';
import {
  DEFAULT_PERMANENT_MENU,
  DEFAULT_DRINK_MENU,
  PERMANENT_MENU_DOC,
  DRINK_MENU_DOC,
  cloneCatalogMenu,
} from '/catalog-menu-data.js';

const state = {
  permanent: cloneCatalogMenu(DEFAULT_PERMANENT_MENU),
  drinks: cloneCatalogMenu(DEFAULT_DRINK_MENU),
};

const config = {
  permanent: {
    containerId: 'catalog-permanent-categories',
    docId: PERMANENT_MENU_DOC,
    fallback: DEFAULT_PERMANENT_MENU,
  },
  drinks: {
    containerId: 'catalog-drinks-categories',
    docId: DRINK_MENU_DOC,
    fallback: DEFAULT_DRINK_MENU,
  },
};

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info',
  };
  const element = document.createElement('div');
  element.className = `toast toast-${type}`;
  element.innerHTML = `<i class="${icons[type]}"></i><span></span>`;
  element.querySelector('span').textContent = message;
  container.appendChild(element);
  setTimeout(() => {
    element.classList.add('toast-exit');
    setTimeout(() => element.remove(), 300);
  }, 4000);
}

function normalizeCategories(value, fallback) {
  if (!Array.isArray(value) || !value.length) return cloneCatalogMenu(fallback);
  return value.map((category, categoryIndex) => ({
    id: String(category.id || `category-${categoryIndex + 1}`),
    title: String(category.title || ''),
    items: Array.isArray(category.items)
      ? category.items.map((item) => ({
        name: String(item?.name || ''),
        description: String(item?.description || ''),
        price: item?.price === '' || item?.price == null ? '' : Number(item.price),
      }))
      : [],
  }));
}

function itemHtml(item, categoryIndex, itemIndex) {
  return `
    <div class="catalog-admin-item" data-category-index="${categoryIndex}" data-item-index="${itemIndex}">
      <div class="catalog-admin-item-main">
        <div class="admin-form-group">
          <label>Název položky</label>
          <input type="text" data-field="name" value="${esc(item.name)}" placeholder="Např. 150 g Hovězí svíčková" />
        </div>
        <div class="admin-form-group catalog-admin-price">
          <label>Cena (Kč)</label>
          <input type="number" data-field="price" value="${esc(item.price)}" min="0" step="1" placeholder="0" />
        </div>
      </div>
      <div class="catalog-admin-item-bottom">
        <div class="admin-form-group">
          <label>Popis (volitelný)</label>
          <input type="text" data-field="description" value="${esc(item.description)}" placeholder="Složení nebo doplňující informace" />
        </div>
        <div class="catalog-admin-row-actions" aria-label="Akce položky">
          <button type="button" data-action="item-up" title="Posunout nahoru"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" data-action="item-down" title="Posunout dolů"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" data-action="item-delete" class="danger" title="Odstranit položku"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    </div>`;
}

function categoryHtml(kind, category, categoryIndex) {
  return `
    <article class="catalog-admin-category" data-kind="${kind}" data-category-index="${categoryIndex}">
      <div class="catalog-admin-category-head">
        <div class="admin-form-group">
          <label>Název kategorie</label>
          <input type="text" data-field="title" value="${esc(category.title)}" placeholder="Název kategorie" />
        </div>
        <div class="catalog-admin-row-actions" aria-label="Akce kategorie">
          <button type="button" data-action="category-up" title="Posunout kategorii nahoru"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" data-action="category-down" title="Posunout kategorii dolů"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" data-action="category-delete" class="danger" title="Odstranit kategorii"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="catalog-admin-items">
        ${category.items.map((item, itemIndex) => itemHtml(item, categoryIndex, itemIndex)).join('')}
      </div>
      <button type="button" class="btn btn-outline btn-sm catalog-add-item" data-action="item-add">
        <i class="fa-solid fa-plus"></i> Přidat položku
      </button>
    </article>`;
}

function render(kind) {
  const container = document.getElementById(config[kind].containerId);
  if (!container) return;
  container.innerHTML = state[kind]
    .map((category, index) => categoryHtml(kind, category, index))
    .join('');
}

function move(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
}

function handleInput(kind, event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const categoryElement = event.target.closest('.catalog-admin-category');
  const itemElement = event.target.closest('.catalog-admin-item');
  const category = state[kind][Number(categoryElement.dataset.categoryIndex)];
  if (!category) return;

  if (!itemElement && field === 'title') {
    category.title = event.target.value;
    return;
  }

  const item = category.items[Number(itemElement?.dataset.itemIndex)];
  if (!item) return;
  item[field] = field === 'price'
    ? (event.target.value === '' ? '' : Number(event.target.value))
    : event.target.value;
}

function handleAction(kind, event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const categoryElement = button.closest('.catalog-admin-category');
  const categoryIndex = Number(categoryElement?.dataset.categoryIndex);
  const category = state[kind][categoryIndex];
  if (!category) return;

  if (action === 'category-up') move(state[kind], categoryIndex, -1);
  if (action === 'category-down') move(state[kind], categoryIndex, 1);
  if (action === 'category-delete') state[kind].splice(categoryIndex, 1);
  if (action === 'item-add') {
    category.items.push({ name: '', description: '', price: '' });
  }

  const itemElement = button.closest('.catalog-admin-item');
  const itemIndex = Number(itemElement?.dataset.itemIndex);
  if (itemElement && action === 'item-up') move(category.items, itemIndex, -1);
  if (itemElement && action === 'item-down') move(category.items, itemIndex, 1);
  if (itemElement && action === 'item-delete') category.items.splice(itemIndex, 1);

  render(kind);
}

function addCategory(kind) {
  state[kind].push({
    id: `category-${Date.now().toString(36)}`,
    title: 'Nová kategorie',
    items: [{ name: '', description: '', price: '' }],
  });
  render(kind);
  const container = document.getElementById(config[kind].containerId);
  container.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function load(kind) {
  try {
    const snap = await getDoc(doc(db, SITE_CONTENT_COLLECTION, config[kind].docId));
    state[kind] = normalizeCategories(
      snap.exists() ? snap.data().categories : null,
      config[kind].fallback,
    );
  } catch (err) {
    state[kind] = cloneCatalogMenu(config[kind].fallback);
    toast(`Menu se nepodařilo načíst: ${err.message}`, 'error');
  }
  render(kind);
}

function cleanForSave(kind) {
  return state[kind].map((category) => ({
    id: String(category.id),
    title: category.title.trim(),
    items: category.items.map((item) => ({
      name: item.name.trim(),
      description: item.description.trim(),
      price: item.price === '' ? '' : Number(item.price),
    })),
  }));
}

async function saveMenus() {
  const permanent = cleanForSave('permanent');
  const drinks = cleanForSave('drinks');
  const allCategories = [...permanent, ...drinks];
  const invalid = !permanent.length || !drinks.length || allCategories.some((category) => (
    !category.title
    || !category.items.length
    || category.items.some((item) => (
      !item.name
      || item.price === ''
      || !Number.isFinite(item.price)
      || item.price < 0
    ))
  ));
  if (invalid) {
    toast('Každá kategorie musí mít název a alespoň jednu položku s názvem a cenou.', 'error');
    return;
  }

  const button = document.getElementById('catalog-save-btn');
  button.disabled = true;
  button.classList.add('loading');
  try {
    await Promise.all([
      setDoc(doc(db, SITE_CONTENT_COLLECTION, PERMANENT_MENU_DOC), {
        categories: permanent,
        updatedAt: serverTimestamp(),
      }),
      setDoc(doc(db, SITE_CONTENT_COLLECTION, DRINK_MENU_DOC), {
        categories: drinks,
        updatedAt: serverTimestamp(),
      }),
    ]);
    state.permanent = permanent;
    state.drinks = drinks;
    toast('Stálé i nápojové menu bylo uloženo.', 'success');
  } catch (err) {
    toast(`Menu se nepodařilo uložit: ${err.message}`, 'error');
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function setupSwitch() {
  const buttons = document.querySelectorAll('.catalog-admin-switch-btn');
  const panels = document.querySelectorAll('.catalog-admin-panel');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
      });
      panels.forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      document.getElementById(`catalog-admin-${button.dataset.catalogPanel}`)?.classList.add('active');
    });
  });
}

async function init() {
  if (!document.getElementById('catalog-menu-manager')) return;
  setupSwitch();

  for (const kind of Object.keys(config)) {
    const container = document.getElementById(config[kind].containerId);
    container?.addEventListener('input', (event) => handleInput(kind, event));
    container?.addEventListener('click', (event) => handleAction(kind, event));
  }

  document.querySelectorAll('.catalog-add-category').forEach((button) => {
    button.addEventListener('click', () => addCategory(button.dataset.menuKind));
  });
  document.getElementById('catalog-save-btn')?.addEventListener('click', saveMenus);

  await Promise.all([load('permanent'), load('drinks')]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
