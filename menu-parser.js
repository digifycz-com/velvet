/* ==========================================================================
   PASÁŽ VELVET - MENU PARSER
   Rozpozná strukturu menu vloženou z Excelu (buňky oddělené tabulátory).

   Očekávaný formát řádku (sloupce oddělené TABem):
     [0] kategorie / den (např. "polévka", "Pondělí") nebo prázdné
     [1] název jídla     (např. "1. (150 g) VEPŘOVÁ PANENKA NA GRILU")
     [2] popis           (např. "s houbovým krémem, ...")
     [3] cena            (např. "159 Kč" / "40,-")
     [4] foodora data    (např. "15" / "25")  – extra číslo, uloží se jako data
     [5] datum           (např. "20.7.2026" / "20.7")

   Modul je čistá logika bez DOM/Firebase — snadno testovatelné.
   ========================================================================== */

// Pořadí sloupců (kdyby se v budoucnu měnilo, stačí upravit zde).
export const COLS = {
  category: 0,
  name: 1,
  description: 2,
  price: 3,
  foodora: 4,
  date: 5,
};

// Kategorie + jejich lidsky čitelné popisky.
export const CATEGORIES = {
  polevka: 'Polévka',
  hlavni: 'Hlavní jídlo',
  dezert: 'Dezert',
  napoj: 'Nápoj',
  salat: 'Salát',
  predkrm: 'Předkrm',
  priloha: 'Příloha',
};

// Klíčová slova pro rozpoznání kategorie z prvního sloupce (bez diakritiky).
const CATEGORY_KEYWORDS = [
  { category: 'polevka', words: ['polevka', 'polevky', 'soup'] },
  { category: 'hlavni', words: ['hlavni jidlo', 'hlavni chod', 'hlavni jidla', 'hlavni chody', 'hlavni', 'main', 'hlav' ] },
  { category: 'predkrm', words: ['predkrm', 'predkrmy', 'starter'] },
  { category: 'salat', words: ['salat', 'salaty', 'salad'] },
  { category: 'dezert', words: ['dezert', 'dezerty', 'desert', 'moucnik', 'moucniky', 'zakusek', 'sladke', 'dessert'] },
  { category: 'napoj', words: ['napoj', 'napoje', 'drink', 'drinks', 'pitivo', 'nealko'] },
  { category: 'priloha', words: ['priloha', 'prilohy', 'side'] },
];

// Nápovědy pro odhad kategorie podle NÁZVU (když řádek nemá vlastní kategorii).
const DRINK_HINTS = [
  // nealko / limonády
  'cola', 'coca', 'pepsi', 'sprite', 'fanta', '7up', 'schweppes', 'kofola',
  'vinea', 'limonad', 'malinovka', 'tonic', 'nealko', 'smoothie', 'milkshake',
  // šťávy
  'dzus', 'juice', 'nektar', 'cappy', 'granini',
  // vody / minerálky
  'mattoni', 'bonaqua', 'aquila', 'magnesia', 'podebradka', 'korunni', 'rajec',
  'mineralka', 'perliva', 'neperliva',
  // pivo
  'pivo', 'birell', 'radler', 'lezak', 'tocene', 'cepovane', 'pilsner',
  'gambrinus', 'kozel', 'radegast', 'staropramen', 'budvar', 'svijany', 'bernard',
  // víno / sekt
  'vino', 'sekt', 'prosecco',
  // teplé nápoje
  'kava', 'espresso', 'presso', 'cappuccino', 'latte', 'macchiato', 'caj',
  // energetické
  'red bull', 'semtex', 'monster',
  // objemy (typické u nápojů)
  '0,5l', '0.5l', '0,33l', '0.33l', '0,25l', '0,2l', '0,3l', 'sklenice',
];
const DESSERT_HINTS = [
  // klasické české
  'dort', 'dortik', 'kolac', 'kolacek', 'zakusek', 'moucnik', 'pernik',
  'medovnik', 'sacher', 'bublanina', 'zemlovka', 'buchty', 'buchtic',
  // smažené / kynuté sladké
  'kobliha', 'koblih', 'vdol', 'livance', 'palacink', 'strudl', 'stroudel',
  'vanocka', 'mazanec',
  // zmrzlina / chlazené / krémové
  'zmrzlin', 'zmrzka', 'nanuk', 'sundae', 'puding', 'pudink', 'pannacotta',
  'panna cotta', 'creme brulee', 'cremebrulee', 'tiramisu', 'cheesecake', 'lava cake',
  // cukrářské
  'venecek', 'vetrnik', 'kremrole', 'laskonk', 'profiterk', 'makronk', 'macaron',
  'muffin', 'brownie', 'cupcake', 'cokolad',
];

const DAY_NAMES = {
  pondeli: 'Pondělí',
  utery: 'Úterý',
  streda: 'Středa',
  ctvrtek: 'Čtvrtek',
  patek: 'Pátek',
  sobota: 'Sobota',
  nedele: 'Neděle',
};

/** Odstraní diakritiku a převede na lowercase pro porovnávání klíčových slov. */
export function deaccent(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Vrátí kanonický název dne, pokud text odpovídá dni v týdnu, jinak null. */
function matchDay(col0norm) {
  const key = col0norm.replace(/[^a-z]/g, '');
  return DAY_NAMES[key] || null;
}

/** Vrátí kód kategorie, pokud první sloupec obsahuje klíčové slovo kategorie. */
function matchCategory(col0norm) {
  if (!col0norm) return null;
  for (const entry of CATEGORY_KEYWORDS) {
    for (const w of entry.words) {
      if (col0norm.startsWith(w) || col0norm === w) return entry.category;
    }
  }
  return null;
}

/** Odhadne kategorii podle názvu jídla (nápoje / dezerty). */
function detectCategoryFromName(nameNorm) {
  if (!nameNorm) return null;
  for (const h of DRINK_HINTS) if (nameNorm.includes(h)) return 'napoj';
  for (const h of DESSERT_HINTS) if (nameNorm.includes(h)) return 'dezert';
  return null;
}

/** "159 Kč" -> 159 ; "40,-" -> 40 ; "1 250 Kč" -> 1250 ; prázdné -> null */
export function parsePrice(s) {
  if (s == null) return null;
  const digits = String(s).replace(/ /g, ' ').replace(/[^\d]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

/** Bezpečně převede celé číslo (foodora data), jinak null. */
export function parseIntOrNull(s) {
  if (s == null || String(s).trim() === '') return null;
  const digits = String(s).replace(/[^\d]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

/** Rozparsuje "20.7.2026" / "20.7" -> {day, month, year|null} nebo null. */
export function parseDateParts(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?\s*(\d{2,4})?\s*$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = m[3] ? parseInt(m[3], 10) : null;
  if (year != null && year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month, year };
}

/** {day, month, year} -> "YYYY-MM-DD" (year musí být znám). */
export function partsToISO(parts) {
  if (!parts || parts.year == null) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${parts.year}-${p(parts.month)}-${p(parts.day)}`;
}

/** Oddělí vedoucí pořadové číslo z názvu: "1. Panenka" -> {number:1, name:"Panenka"} */
function splitNumber(name) {
  const m = String(name).match(/^\s*(\d{1,3})\s*[.)]\s*(.*)$/);
  if (m) return { number: parseInt(m[1], 10), name: m[2].trim() };
  return { number: null, name: String(name).trim() };
}

/**
 * Hlavní funkce. Vrátí:
 * {
 *   items: [ { day, category, categoryLabel, number, name, description,
 *              price, foodora, dateRaw, dateISO } ],
 *   days:  [ { day, dateISO, dateRaw, items:[...] } ],
 *   suggestedDate, suggestedDay, warnings: []
 * }
 */
export function parseMenuPaste(rawText, options = {}) {
  const defaultYear = options.defaultYear || null;
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const items = [];
  const warnings = [];
  let currentDay = null;
  let currentCategory = null; // "běžící" kategorie pro následující řádky bez štítku

  for (const rawLine of lines) {
    if (rawLine.trim() === '') continue;

    const cols = rawLine.split('\t').map((c) => c.trim());
    const col0 = cols[COLS.category] || '';
    const col0norm = deaccent(col0);
    const restEmpty = cols.slice(1).every((c) => !c);

    // --- Den v týdnu (samostatný oddělovač) ---
    const day = matchDay(col0norm);
    if (day && restEmpty) {
      currentDay = day;
      currentCategory = null;
      continue;
    }

    // --- Kategorie ve sloupci 0 ---
    const rowCategory = matchCategory(col0norm);

    const rawName = cols[COLS.name] || '';
    const description = cols[COLS.description] || '';
    const priceRaw = cols[COLS.price] || '';
    const foodoraRaw = cols[COLS.foodora] || '';
    const dateRaw = cols[COLS.date] || '';

    const hasContent = Boolean(rawName || description || priceRaw);

    // Řádek je pouze štítek kategorie (bez obsahu) -> nastaví běžící sekci.
    if (rowCategory && !hasContent) {
      currentCategory = rowCategory;
      continue;
    }

    // Neznámý text v col0 bez obsahu -> vlastní oddělovač sekce (ignorujeme jako běžící null).
    if (!rowCategory && col0 && !hasContent && !day) {
      currentCategory = null;
      continue;
    }

    if (!hasContent) continue;

    // --- Rozpoznání kategorie položky ---
    const { number, name } = splitNumber(rawName);
    const nameNorm = deaccent(name);

    let category;
    if (rowCategory) {
      category = rowCategory;
    } else {
      category = detectCategoryFromName(nameNorm) || currentCategory || 'hlavni';
    }

    // Polévka bývá jediná: po jejím řádku přepneme běžící sekci na hlavní jídla.
    if (rowCategory === 'polevka') {
      currentCategory = 'hlavni';
    } else if (rowCategory) {
      currentCategory = rowCategory;
    }

    // Rok doplníme až v druhém průchodu (dle nejčastějšího roku v celé vložce),
    // aby částečné datum jako "20.7" dostalo správný rok i u více dnů najednou.
    const dateParts = parseDateParts(dateRaw);

    items.push({
      day: currentDay,
      category,
      categoryLabel: CATEGORIES[category] || category,
      number,
      name,
      description,
      price: parsePrice(priceRaw),
      foodora: parseIntOrNull(foodoraRaw),
      dateRaw,
      dateISO: partsToISO(dateParts), // null, pokud rok chybí
    });
  }

  // --- Doplnění roku u částečných dat (např. "20.7" → nejčastější rok z vložky) ---
  const yearCounts = {};
  for (const it of items) {
    if (it.dateISO) {
      const y = it.dateISO.slice(0, 4);
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  }
  const sortedYears = Object.keys(yearCounts).sort((a, b) => yearCounts[b] - yearCounts[a]);
  const fillYear = sortedYears.length ? parseInt(sortedYears[0], 10) : defaultYear;
  if (fillYear) {
    for (const it of items) {
      if (!it.dateISO && it.dateRaw) {
        const p = parseDateParts(it.dateRaw);
        if (p) {
          p.year = fillYear;
          it.dateISO = partsToISO(p);
        }
      }
    }
  }

  // --- Seskupení podle dne / data ---
  const groupsMap = new Map();
  for (const it of items) {
    const key = it.dateISO || it.day || '__default__';
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        day: it.day,
        dateISO: it.dateISO,
        dateRaw: it.dateRaw,
        items: [],
      });
    }
    groupsMap.get(key).items.push(it);
  }
  const days = Array.from(groupsMap.values());

  if (items.length === 0) {
    warnings.push('Nepodařilo se rozpoznat žádnou položku. Zkontrolujte, že jsou buňky oddělené tabulátory (kopie přímo z Excelu).');
  }
  const missingName = items.filter((i) => !i.name).length;
  if (missingName > 0) {
    warnings.push(`${missingName} položek nemá název — doplňte je ručně v náhledu.`);
  }

  const firstWithDate = days.find((d) => d.dateISO) || days[0] || null;

  return {
    items,
    days,
    suggestedDate: firstWithDate?.dateISO || null,
    suggestedDay: items.find((i) => i.day)?.day || null,
    warnings,
  };
}
