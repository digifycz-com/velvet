/* ==========================================================================
   PASÁŽ VELVET – Nahrávání obrázků do Firebase Storage
   Sdílí administrace aktualit i galerie.

   Fotky z telefonu mívají několik MB, což by se načítalo na webu zbytečně
   dlouho. Proto se každý obrázek před odesláním zmenší a překóduje do WebP
   přímo v prohlížeči – na server jde jen výsledek.
   ========================================================================== */

import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import { app } from '/firebase-db.js';

export const storage = getStorage(app);

// Delší strana výsledného obrázku v pixelech. 1600 px odpovídá fotkám, které
// už v galerii jsou – nižší hodnota by nové fotky ve stejném prohlížeči
// vedle starých viditelně rozmazala.
const FULL_MAX_EDGE = 1600;
// Dlaždice galerie má na webu ~276 px, náhled tedy pokryje i retina displej.
const THUMB_MAX_EDGE = 560;

// Strop velikosti výsledku. Stávající fotky mají v průměru 103 kB (plná)
// a 34 kB (náhled), tohle je drží na stejné úrovni.
const FULL_MAX_BYTES = 110 * 1024;
const THUMB_MAX_BYTES = 30 * 1024;

// Kvalita se zkouší odshora dolů, dokud se soubor nevejde do stropu.
const QUALITY_STEPS = [0.78, 0.68, 0.58, 0.5, 0.42];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Storage jinak posílá "private, max-age=0" a prohlížeč fotky stahuje při
// každém načtení znovu – zbytečný přenos i účtované operace. Název souboru
// je unikátní a obsah se nikdy nemění, takže je bezpečné cachovat natrvalo.
const IMAGE_METADATA = {
  contentType: 'image/webp',
  cacheControl: 'public, max-age=31536000, immutable',
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Soubor se nepodařilo načíst jako obrázek.'));
    };
    img.src = url;
  });
}

function drawScaled(img, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encode(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Převod obrázku selhal.'))),
      'image/webp',
      quality,
    );
  });
}

/**
 * Zakóduje obrázek do WebP tak, aby se vešel do stropu. Pevná kvalita by
 * u členité fotky dala zbytečně velký soubor a u jednoduché zbytečně malý,
 * proto se kvalita snižuje, dokud výsledek nesedí.
 */
async function toWebp(img, maxEdge, maxBytes) {
  let best = null;

  for (const quality of QUALITY_STEPS) {
    // eslint-disable-next-line no-await-in-loop
    best = await encode(drawScaled(img, maxEdge), quality);
    if (best.size <= maxBytes) return best;
  }

  // Ani na nejnižší kvalitě se to nevešlo – zmenšíme rozměr a zkusíme znovu.
  const smaller = drawScaled(img, Math.round(maxEdge * 0.75));
  for (const quality of QUALITY_STEPS) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await encode(smaller, quality);
    if (blob.size < best.size) best = blob;
    if (blob.size <= maxBytes) return blob;
  }

  return best;
}

/* Náhodná část názvu, aby si dva soubory se stejným jménem nepřepsaly. */
function uniqueName() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${rand}`;
}

/**
 * Nahraje obrázek do zadané složky a vrátí { url, path, thumbUrl, thumbPath }.
 * `thumb` = false u míst, kde druhá velikost nemá smysl (aktuality).
 */
export async function uploadImage(file, folder, { thumb = false } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name}: není to obrázek.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name}: soubor je větší než 15 MB.`);
  }

  const img = await loadImage(file);
  const name = uniqueName();

  const fullBlob = await toWebp(img, FULL_MAX_EDGE, FULL_MAX_BYTES);
  const fullPath = `${folder}/${name}.webp`;
  const fullRef = ref(storage, fullPath);
  await uploadBytes(fullRef, fullBlob, IMAGE_METADATA);

  const result = {
    url: await getDownloadURL(fullRef),
    path: fullPath,
    // Kvůli hlášce v administraci, ať je vidět, co z fotky zbylo.
    bytes: fullBlob.size,
    originalBytes: file.size,
  };

  if (thumb) {
    const thumbBlob = await toWebp(img, THUMB_MAX_EDGE, THUMB_MAX_BYTES);
    const thumbPath = `${folder}/${name}-thumb.webp`;
    const thumbRef = ref(storage, thumbPath);
    await uploadBytes(thumbRef, thumbBlob, IMAGE_METADATA);
    result.thumbUrl = await getDownloadURL(thumbRef);
    result.thumbPath = thumbPath;
    result.bytes += thumbBlob.size;
  }

  return result;
}

/* Hláška typu „3 fotky · 5,2 MB → 0,3 MB". */
export function formatSavings(images) {
  const kb = (bytes) => (bytes / 1024 >= 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} kB`);
  const before = images.reduce((sum, i) => sum + (i.originalBytes || 0), 0);
  const after = images.reduce((sum, i) => sum + (i.bytes || 0), 0);
  return `${kb(before)} → ${kb(after)}`;
}

/**
 * Smaže obrázek ze Storage. Chybu jen zaloguje – když soubor už neexistuje
 * (nebo pochází z repozitáře, ne ze Storage), nemá smysl kvůli tomu shodit
 * ukládání celé galerie.
 */
export async function deleteImage(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    console.log(`Soubor ${path} se nepodařilo smazat:`, err.message);
  }
}
