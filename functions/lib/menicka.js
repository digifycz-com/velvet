/* ==========================================================================
   MENIČKA.CZ – generátor XML feedu
   Menička nemá push API; místo toho si 1×/den (~6:00) stáhne XML z naší URL.
   Formát vychází ze specifikace https://www.menicka.cz/xml-feed.html
   POZOR: přesné názvy elementů si před ostrým provozem ověř v jejich specifikaci
   (a případně uprav mapování níže). Struktura je držena tak, aby se snadno měnila.
   ========================================================================== */

function xmlEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// "2026-07-20" -> "20.07.2026" (formát datumu pro Meničku).
function toCzDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// Naše kategorie -> TYP v Meničce (polevka | jidlo | poznamka).
function menickaType(category) {
  if (category === 'polevka') return 'polevka';
  return 'jidlo';
}

/**
 * @param {Array} days  pole dokumentů denního menu z Firestore
 * @returns {string}    XML feed
 */
function buildMenickaXml(days) {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<jidelnicky>'];

  for (const day of days || []) {
    const datum = toCzDate(day.date);
    lines.push(`  <jidelnicek datum="${xmlEscape(datum)}">`);

    for (const item of day.items || []) {
      if (!item.name) continue;
      const typ = menickaType(item.category);
      const num = item.number ? `${item.number}. ` : '';
      const nameFull = `${num}${item.name}`;
      const cena = item.price != null && item.price !== '' ? String(item.price) : '';
      lines.push('    <polozka>');
      lines.push(`      <typ>${xmlEscape(typ)}</typ>`);
      lines.push(`      <text>${xmlEscape(nameFull)}${item.description ? ' – ' + xmlEscape(item.description) : ''}</text>`);
      if (cena) lines.push(`      <cena>${xmlEscape(cena)}</cena>`);
      lines.push('    </polozka>');
    }

    lines.push('  </jidelnicek>');
  }

  lines.push('</jidelnicky>');
  return lines.join('\n');
}

module.exports = { buildMenickaXml };
