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

// Delší strana výsledného obrázku v pixelech.
const FULL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 640;
const WEBP_QUALITY = 0.82;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

function toWebp(img, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Převod obrázku selhal.'))),
      'image/webp',
      WEBP_QUALITY,
    );
  });
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

  const fullBlob = await toWebp(img, FULL_MAX_EDGE);
  const fullPath = `${folder}/${name}.webp`;
  const fullRef = ref(storage, fullPath);
  await uploadBytes(fullRef, fullBlob, { contentType: 'image/webp' });

  const result = {
    url: await getDownloadURL(fullRef),
    path: fullPath,
  };

  if (thumb) {
    const thumbBlob = await toWebp(img, THUMB_MAX_EDGE);
    const thumbPath = `${folder}/${name}-thumb.webp`;
    const thumbRef = ref(storage, thumbPath);
    await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' });
    result.thumbUrl = await getDownloadURL(thumbRef);
    result.thumbPath = thumbPath;
  }

  return result;
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
