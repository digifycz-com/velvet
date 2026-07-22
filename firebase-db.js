/* ==========================================================================
   PASÁŽ VELVET - Sdílená Firebase / Firestore inicializace
   Používá se v administraci i na veřejné stránce.
   ========================================================================== */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDrgntp8csj1eBlGKoVqDHfoRjpJ_W35fI',
  authDomain: 'velvet-cz.firebaseapp.com',
  projectId: 'velvet-cz',
  storageBucket: 'velvet-cz.firebasestorage.app',
  messagingSenderId: '102894275372',
  appId: '1:102894275372:web:b5036d8aa51820909c3a89',
  measurementId: 'G-YBX1QC01CP',
};

// Sdílíme jednu instanci app (admin.js ji už mohl inicializovat).
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Region nasazených Cloud Functions.
export const FUNCTIONS_REGION = 'europe-west1';

// Kolekce denních menu (id dokumentu = datum "YYYY-MM-DD").
export const MENU_COLLECTION = 'dailyMenus';

// Platformy pro automatický export.
export const SYNC_PLATFORMS = ['foodora', 'wolt', 'menicka'];

// Popisky platforem.
export const PLATFORM_LABELS = {
  foodora: 'Foodora',
  wolt: 'Wolt',
  menicka: 'Menicka.cz',
};

// Za jak dlouho po uložení se má menu automaticky odeslat (minuty).
export const AUTO_SYNC_MINUTES = 10;
