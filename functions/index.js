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
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('node:crypto');

const { buildMenickaXml } = require('./lib/menicka');
const { pushToFoodora } = require('./lib/foodora');
const { pushToWolt } = require('./lib/wolt');

admin.initializeApp();
const db = admin.firestore();

const MENU_COLLECTION = 'dailyMenus';
const REGION = 'europe-west1';
const ADMIN_SHARED_PASSWORD = defineSecret('ADMIN_SHARED_PASSWORD');
const ADMIN_UID = 'velvet-admin';
const LOGIN_ATTEMPTS_COLLECTION = '_adminLoginAttempts';

function passwordMatches(received, expected) {
  const receivedBuffer = Buffer.from(String(received || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function requestIp(req) {
  const forwarded = req.rawRequest?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.rawRequest?.ip || 'unknown';
}

async function recordFailedLogin(ref, now) {
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 8;
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const previous = snap.exists ? snap.data() : {};
    const windowStart = Number(previous.windowStart || 0);
    const inWindow = now - windowStart < windowMs;
    const attempts = inWindow ? Number(previous.attempts || 0) + 1 : 1;
    transaction.set(ref, {
      attempts,
      windowStart: inWindow ? windowStart : now,
      blockedUntil: attempts >= maxAttempts ? now + windowMs : 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

// ==========================================================================
// ADMIN LOGIN – bezpečné přihlášení pouze heslem
// Heslo žije pouze v Google Secret Manageru. Klient po úspěšném ověření
// dostane krátkodobý Firebase custom token a dále používá standardní Auth.
// ==========================================================================
exports.adminPasswordLogin = onCall(
  {
    region: REGION,
    secrets: [ADMIN_SHARED_PASSWORD],
    maxInstances: 5,
  },
  async (req) => {
    const password = req.data?.password;
    if (typeof password !== 'string' || !password) {
      throw new HttpsError('invalid-argument', 'Chybí heslo.');
    }

    const expected = ADMIN_SHARED_PASSWORD.value();
    const ipHash = crypto
      .createHmac('sha256', expected)
      .update(requestIp(req))
      .digest('hex');
    const attemptRef = db.collection(LOGIN_ATTEMPTS_COLLECTION).doc(ipHash);
    const attemptSnap = await attemptRef.get();
    const blockedUntil = attemptSnap.exists
      ? Number(attemptSnap.data().blockedUntil || 0)
      : 0;
    const now = Date.now();

    if (blockedUntil > now) {
      throw new HttpsError('resource-exhausted', 'Příliš mnoho pokusů.');
    }

    if (!passwordMatches(password, expected)) {
      await recordFailedLogin(attemptRef, now);
      await new Promise((resolve) => setTimeout(resolve, 450));
      throw new HttpsError('unauthenticated', 'Nesprávné heslo.');
    }

    await attemptRef.delete().catch(() => {});
    try {
      await admin.auth().getUser(ADMIN_UID);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      await admin.auth().createUser({
        uid: ADMIN_UID,
        displayName: 'Pasáž Velvet administrátor',
      });
    }

    const token = await admin.auth().createCustomToken(ADMIN_UID, { admin: true });
    return { token };
  },
);

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
// 4) ÚKLID – jednou denně smaže dny starší než KEEP_PAST_DAYS. Bez toho se
//    v administraci (a taky ve feedu pro Meničku) hromadí desítky dávno
//    proběhlých dnů a aktuální nabídka se v nich ztrácí.
// ==========================================================================

// Kolik dnů dozadu (kromě dneška) v databázi zůstává.
const KEEP_PAST_DAYS = 2;

// Dnešek jako "YYYY-MM-DD" v pražské zóně. Functions běží v UTC, takže
// new Date().toISOString() by v noci ukazoval ještě včerejšek.
function pragueDateISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftISO(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`); // poledne = bezpečné vůči přechodu na letní čas
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

exports.cleanupOldMenus = onSchedule(
  { region: REGION, schedule: '30 3 * * *', timeZone: 'Europe/Prague' },
  async () => {
    const cutoff = shiftISO(pragueDateISO(), -KEEP_PAST_DAYS);
    const snap = await db.collection(MENU_COLLECTION).get();

    // Datum bereme z pole `date`, u případných starších záznamů z ID dokumentu.
    const stale = snap.docs.filter((doc) => {
      const date = String(doc.data().date || doc.id || '').slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoff;
    });

    if (!stale.length) {
      logger.info(`cleanupOldMenus: nic ke smazání (hranice ${cutoff})`);
      return;
    }

    // Batch zvládne 500 zápisů. Denně jich přibude pár, ale první úklid
    // nasbírané historie se do jedné dávky vejít nemusí.
    for (let i = 0; i < stale.length; i += 400) {
      const batch = db.batch();
      for (const doc of stale.slice(i, i + 400)) batch.delete(doc.ref);
      await batch.commit();
    }

    logger.info(`cleanupOldMenus: smazáno ${stale.length} dnů starších než ${cutoff}`);
  }
);

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
