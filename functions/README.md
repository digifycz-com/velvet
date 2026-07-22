# Pasáž Velvet – Cloud Functions (synchronizace menu)

Automatický export denního menu z Firestore na **Meničku**, **Foodoru** a **Wolt**.

## Co která funkce dělá

| Funkce | Typ | Účel |
|---|---|---|
| `menickaFeed` | HTTP | Veřejný XML feed denních menu. Menička si ho sama stahuje ~1×/den. |
| `syncDailyMenus` | Naplánovaná (každých 5 min) | Najde dny „splatné" k exportu (`sync.scheduledFor` v minulosti a `sync.processed != true`) a odešle je na Foodoru/Wolt. Tím vzniká automatický export ~do 10 minut od uložení. |
| `syncMenuNow` | Callable | Ruční „Nahrát teď" z administrace. |

Menička je **pull** model (nemá push API) – proto se neodesílá, ale hostuje se XML feed.
Foodora a Wolt jsou **push** přes jejich API a **vyžadují partnerské přístupy**.

## Předpoklady

1. **Firebase plán Blaze** (Cloud Functions + Scheduler vyžadují Blaze).
2. Nainstalovaný Firebase CLI: `npm i -g firebase-tools`, `firebase login`.
3. Partnerské přístupy (až je získáš od account managerů):
   - **Foodora/Delivery Hero:** `client_id`, `client_secret`, `chainID`, `vendorID`.
   - **Wolt:** OAuth `client_id`, `client_secret`, `venueId` (po schválení integrace).

## Nastavení

```bash
cd functions
npm install

# tajné klíče (uloží se bezpečně, ne do gitu):
firebase functions:secrets:set FOODORA_CLIENT_SECRET
firebase functions:secrets:set WOLT_CLIENT_SECRET

# necitlivé ID: zkopíruj .env.example -> .env a vyplň
cp .env.example .env
```

## Nasazení

```bash
# z kořene projektu
firebase deploy --only functions
# volitelně pravidla Firestore (viz firestore.rules – pozor na vypnutý admin login!)
firebase deploy --only firestore:rules
```

Po nasazení:
- URL feedu bude `https://europe-west1-velvet-cz.cloudfunctions.net/menickaFeed`
  → zadej ji v administraci Meničky (Automatický import z XML).
- `syncDailyMenus` poběží automaticky každých 5 minut.
- Tlačítko „Nahrát teď" v administraci zavolá `syncMenuNow`.

## Stav integrací

- ✅ **Menička** – XML feed je funkční hned po nasazení (bez přístupů). *Před ostrým
  provozem si over přesné názvy elementů dle https://www.menicka.cz/xml-feed.html
  a případně uprav `lib/menicka.js`.*
- ⚠️ **Foodora** (`lib/foodora.js`) – OAuth + Catalog API je připraveno, ale mapování
  denních položek na katalogové produkty (`product IDs`) je nutné doladit podle
  konkrétní provozovny (viz `TODO`). Bez partnerských přístupů nelze reálně volat.
- ⚠️ **Wolt** (`lib/wolt.js`) – OAuth + Menu API je připraveno; před ostrým provozem
  ověř přesné schéma payloadu a projdi Wolt sandbox/QA (viz `TODO`).
