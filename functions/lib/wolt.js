/* ==========================================================================
   WOLT – Menu API (PUSH)
   Dokumentace: https://developer.wolt.com/docs/api/menu
                https://developer.wolt.com/docs/getting-started/restaurant

   NUTNÉ PŘEDPOKLADY (bez nich se nedá reálně volat):
     • Schválená integrace ve Wolt Partner programu (sandbox → QA → produkce)
     • OAuth client credentials vydané Wolt account managerem
     • venueId (Wolt ID provozovny)

   Konfigurace (Cloud Functions):
     firebase functions:secrets:set WOLT_CLIENT_SECRET
     .env / params:  WOLT_CLIENT_ID, WOLT_VENUE_ID
   ========================================================================== */

const TOKEN_URL = 'https://authentication.wolt.com/oauth/token';

async function getWoltToken(clientSecret) {
  const clientId = process.env.WOLT_CLIENT_ID;
  if (!clientId || !clientSecret) {
    throw new Error('Chybí WOLT_CLIENT_ID / WOLT_CLIENT_SECRET.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Wolt OAuth ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

// Naše kategorie -> název sekce v menu Woltu.
function sectionName(item) {
  return item.categoryLabel || item.category || 'Denní menu';
}

/**
 * Nahradí/aktualizuje menu provozovny na Woltu.
 * @param {object} day  dokument denního menu
 * @param {object} opts { clientSecret }
 */
async function pushToWolt(day, opts = {}) {
  const venueId = process.env.WOLT_VENUE_ID;
  if (!venueId) {
    throw new Error('Chybí WOLT_VENUE_ID – nastav po získání partnerských přístupů.');
  }

  const token = await getWoltToken(opts.clientSecret);

  // Poskládá menu payload podle Wolt Menu API (POST /v1/restaurants/{venueId}/menu).
  // TODO (po získání přístupů): ověřit přesné schéma (currency, options, image, GTIN…)
  // a případně použít PATCH /venues/{venueId}/items pro cílené úpravy cen.
  const sections = {};
  for (const it of day.items || []) {
    if (!it.name) continue;
    const key = sectionName(it);
    (sections[key] ||= []).push({
      name: `${it.number ? it.number + '. ' : ''}${it.name}`,
      description: it.description || '',
      price: (it.price != null ? it.price : 0) * 100, // Wolt uvádí cenu v haléřích
      external_id: `velvet-${day.date}-${it.number ?? it.name}`,
      enabled: true,
    });
  }

  const payload = {
    currency: 'CZK',
    primary_language: 'cs',
    menu: {
      categories: Object.entries(sections).map(([name, items], idx) => ({
        id: `cat-${idx}`,
        name,
        items,
      })),
    },
  };

  const endpoint = `https://pos-integration-service.wolt.com/v1/restaurants/${venueId}/menu`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Wolt Menu ${res.status}: ${await res.text()}`);

  const count = payload.menu.categories.reduce((n, c) => n + c.items.length, 0);
  return { message: `Odesláno ${count} položek na Wolt.` };
}

module.exports = { pushToWolt };
