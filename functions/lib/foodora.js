/* ==========================================================================
   FOODORA / DELIVERY HERO – Catalog API (PUSH)
   Dokumentace: https://developer.foodora.com/en/documentation/catalog-api-how-to-integrate
                https://developers.deliveryhero.com/documentation/pos.html

   NUTNÉ PŘEDPOKLADY (bez nich se nedá reálně volat):
     • Partnerský přístup (schválená integrace / POS partner)
     • client_id + client_secret vydané Account Managerem
     • chainID (a vendorID / mapování produktů)

   Konfigurace (Cloud Functions):
     firebase functions:secrets:set FOODORA_CLIENT_SECRET
     .env / params:  FOODORA_CLIENT_ID, FOODORA_CHAIN_ID, FOODORA_VENDOR_ID
   ========================================================================== */

const TOKEN_URL = 'https://foodora.partner.deliveryhero.io/v2/oauth/token';

async function getFoodoraToken(clientSecret) {
  const clientId = process.env.FOODORA_CLIENT_ID;
  if (!clientId || !clientSecret) {
    throw new Error('Chybí FOODORA_CLIENT_ID / FOODORA_CLIENT_SECRET.');
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
  if (!res.ok) throw new Error(`Foodora OAuth ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

/**
 * Odešle denní menu na Foodoru.
 * @param {object} day  dokument denního menu
 * @param {object} opts { clientSecret }
 */
async function pushToFoodora(day, opts = {}) {
  const chainId = process.env.FOODORA_CHAIN_ID;
  const vendorId = process.env.FOODORA_VENDOR_ID;
  if (!chainId || !vendorId) {
    throw new Error('Chybí FOODORA_CHAIN_ID / FOODORA_VENDOR_ID – nastav po získání partnerských přístupů.');
  }

  const token = await getFoodoraToken(opts.clientSecret);

  // TODO (po získání přístupů): namapovat denní položky na katalogové produkty
  // Foodory. Catalog API pracuje s existujícími produkty (product IDs) – denní
  // menu je proto potřeba buď zakládat jako produkty, nebo aktualizovat ceny/stav
  // u předdefinovaných "denní menu" slotů. Přesné endpointy dle Catalog API:
  //   PUT  .../chains/{chainId}/catalog  (aktualizace ceny/stavu/dostupnosti)
  //   POST .../chains/{chainId}/catalog/export  (vyžádání exportu sortimentu)
  const endpoint = `https://foodora.partner.deliveryhero.io/v2/chains/${chainId}/catalog`;

  const payload = {
    vendors: [vendorId],
    catalog: {
      items: (day.items || [])
        .filter((it) => it.name)
        .map((it, i) => ({
          externalId: `velvet-${day.date}-${it.number ?? i}`,
          title: `${it.number ? it.number + '. ' : ''}${it.name}`,
          description: it.description || '',
          price: it.price != null ? it.price : 0,
          category: it.categoryLabel || it.category || 'Denní menu',
          active: true,
        })),
    },
  };

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Foodora Catalog ${res.status}: ${await res.text()}`);

  return { message: `Odesláno ${payload.catalog.items.length} položek na Foodoru.` };
}

module.exports = { pushToFoodora };
