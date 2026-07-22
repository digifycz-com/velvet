/* ==========================================================================
   PASÁŽ VELVET - Cloud Functions
   Synchronizace denního menu (Firestore "dailyMenus") na platformy:
     • Menička  – PULL model: hostujeme XML feed, Menička si ho stahuje ~1×/den
     • Foodora  – PUSH přes Catalog API (OAuth) – vyžaduje partnerské přístupy
     • Wolt     – PUSH přes Menu API (OAuth)   – vyžaduje partnerské přístupy

   Nasazení + konfigurace: viz functions/README.md
   ========================================================================== */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const { buildMenickaXml } = require('./lib/menicka');
const { pushToFoodora } = require('./lib/foodora');
const { pushToWolt } = require('./lib/wolt');

admin.initializeApp();
const db = admin.firestore();

const MENU_COLLECTION = 'dailyMenus';
const REGION = 'europe-west1';

// Push adaptéry (Menička je pull, řeší se přes menickaFeed).
// Přístupové údaje se čtou z process.env (functions/.env – viz .env.example).
const PUSH_PLATFORMS = { foodora: pushToFoodora, wolt: pushToWolt };

// Je platforma nakonfigurovaná? Bez přístupů se přeskočí (stav „disabled").
function isConfigured(name) {
  if (name === 'foodora') {
    return Boolean(
      process.env.FOODORA_CLIENT_ID && process.env.FOODORA_CLIENT_SECRET &&
      process.env.FOODORA_CHAIN_ID && process.env.FOODORA_VENDOR_ID
    );
  }
  if (name === 'wolt') {
    return Boolean(
      process.env.WOLT_CLIENT_ID && process.env.WOLT_CLIENT_SECRET && process.env.WOLT_VENUE_ID
    );
  }
  return false;
}

function nowISO() {
  return new Date().toISOString();
}

// ==========================================================================
// 1) MENIČKA – veřejný XML feed (Menička si ho sama stahuje)
//    URL: https://<region>-<projekt>.cloudfunctions.net/menickaFeed
//    Tuto URL zadáš v administraci Meničky (Automatický import z XML).
// ==========================================================================
exports.menickaFeed = onRequest({ region: REGION, cors: true }, async (req, res) => {
  try {
    const snap = await db.collection(MENU_COLLECTION).orderBy('date').get();
    const days = [];
    snap.forEach((doc) => days.push(doc.data()));
    const xml = buildMenickaXml(days);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(xml);
  } catch (err) {
    logger.error('menickaFeed error', err);
    res.status(500).send('<?xml version="1.0"?><error/>');
  }
});

// ==========================================================================
// 2) NAPLÁNOVANÝ SYNC – každých 5 min zkontroluje dny „splatné" k exportu
//    (scheduledFor <= teď a ještě nezpracované) → odešle na Foodoru/Wolt.
//    Tím vzniká automatický export „do ~10 minut" od uložení.
// ==========================================================================
exports.syncDailyMenus = onSchedule(
  { region: REGION, schedule: 'every 5 minutes' },
  async () => {
    const now = Date.now();
    const snap = await db.collection(MENU_COLLECTION).get();
    let processed = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const sync = data.sync;
      if (!sync || !sync.scheduledFor || sync.processed) continue;
      if (Date.parse(sync.scheduledFor) > now) continue; // ještě není čas
      await syncOneDoc(doc.ref, data);
      processed += 1;
    }
    logger.info(`syncDailyMenus: zpracováno ${processed} dnů`);
  }
);

// ==========================================================================
// 3) RUČNÍ SYNC – „Nahrát teď" z administrace (callable)
// ==========================================================================
exports.syncMenuNow = onCall({ region: REGION }, async (req) => {
  const date = req.data && req.data.date;
  if (!date) throw new HttpsError('invalid-argument', 'Chybí datum menu.');

  const ref = db.collection(MENU_COLLECTION).doc(date);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', `Den ${date} neexistuje.`);

  const result = await syncOneDoc(ref, snap.data());
  return { ok: true, result };
});

// ==========================================================================
// Sdílená logika: odešle jeden den na všechny push platformy + Meničku.
// Průběžně zapisuje stav do sync.platforms.<name>.
// ==========================================================================
async function syncOneDoc(ref, data) {
  const platforms = { ...((data.sync && data.sync.platforms) || {}) };
  const outcome = {};

  for (const [name, pushFn] of Object.entries(PUSH_PLATFORMS)) {
    // Bez nakonfigurovaných přístupů platformu přeskočíme (stav „vypnuto").
    if (!isConfigured(name)) {
      platforms[name] = {
        status: 'disabled', at: nowISO(),
        message: 'Nenakonfigurováno – doplň partnerské přístupy (functions/.env).',
      };
      await ref.update({ [`sync.platforms.${name}`]: platforms[name] });
      outcome[name] = 'disabled';
      continue;
    }

    platforms[name] = { status: 'uploading', at: nowISO(), message: '' };
    await ref.update({ [`sync.platforms.${name}`]: platforms[name] });

    try {
      const res = await pushFn(data, {
        clientSecret: name === 'foodora'
          ? process.env.FOODORA_CLIENT_SECRET
          : process.env.WOLT_CLIENT_SECRET,
      });
      platforms[name] = { status: 'uploaded', at: nowISO(), message: (res && res.message) || '' };
      outcome[name] = 'uploaded';
    } catch (err) {
      logger.error(`${name} sync failed`, err);
      platforms[name] = { status: 'failed', at: nowISO(), message: String((err && err.message) || err) };
      outcome[name] = 'failed';
    }
    await ref.update({ [`sync.platforms.${name}`]: platforms[name] });
  }

  // Menička = pull model. Data jsou připravená v XML feedu, ale u Meničky se
  // zobrazí až po jednorázovém zadání URL feedu v její administraci. Dokud to
  // majitel neudělá, hlásíme „zatím nenastaveno" (neděláme falešné „odesláno").
  platforms.menicka = {
    status: 'disabled',
    at: nowISO(),
    message: 'Připraveno. Zobrazí se na Menička.cz po jednorázovém zadání odkazu v její administraci.',
  };
  outcome.menicka = 'disabled';

  await ref.update({
    'sync.platforms.menicka': platforms.menicka,
    'sync.processed': true,
    'sync.lastSyncedAt': nowISO(),
  });

  return outcome;
}
