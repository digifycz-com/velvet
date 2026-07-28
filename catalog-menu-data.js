/* ==========================================================================
   PASÁŽ VELVET – VÝCHOZÍ STÁLÉ A NÁPOJOVÉ MENU
   Slouží jako okamžitý veřejný fallback a jako počáteční obsah administrace.
   Uložená data ve Firestore mají přednost.
   ========================================================================== */

export const PERMANENT_MENU_DOC = 'permanentMenu';
export const DRINK_MENU_DOC = 'drinkMenu';

export const DEFAULT_PERMANENT_MENU = [
  {
    id: 'polevky',
    title: 'Polévky',
    items: [
      { name: '0,3 l Hovězí vývar', description: 'Játrové knedlíčky.', price: 50 },
      { name: '0,3 l Hříbkový krém', description: 'Zastřené vejce, slaninové škvarky, petrželový olej.', price: 60 },
      { name: '0,3 l Polévka dle denní nabídky', description: '', price: 50 },
    ],
  },
  {
    id: 'na-zacatek',
    title: 'Na začátek',
    items: [
      { name: '100 g Paštika z kuřecích jater', description: 'Brusinková omáčka, ořechy, chléb.', price: 130 },
      { name: '100 g Anglický roastbeef', description: 'Chimichurri, krutony, kapary, nakládaná zelenina.', price: 180 },
      { name: '100 g Grilovaný hermelín', description: 'Brusinková omáčka, salát z listů, ořechy.', price: 180 },
    ],
  },
  {
    id: 'k-pivu',
    title: 'K pivu',
    items: [
      { name: '150 g Topinka Velvet', description: 'Vepřová líčka, rozpečený chléb, pečený česnek, hořčice, naše nakládaná zelenina.', price: 180 },
      { name: '200 g Trhaný BBQ talíř', description: 'Trhané vepřové maso, BBQ, hranolky, cheddar, slanina, jalapeños.', price: 250 },
      { name: '100 g Tatarský biftek', description: 'Od nás míchaný, 4 ks topinek, česnek.', price: 199 },
      { name: '300 g Parmazánové kořeněné hranolky', description: 'Hranolky, parmazán, slanina, koření a výběr jedné omáčky.', price: 150 },
    ],
  },
  {
    id: 'salaty',
    title: 'Saláty',
    items: [
      { name: '150 g Caesar salát s kuřecím masem', description: 'Dresink, opečená pancetta, římský salát, parmazán a krutony.', price: 250 },
      { name: '150 g Kuřecí salát', description: 'Trhané listy, zelenina, kuřecí maso, vinaigrette.', price: 230 },
      { name: '100 g Salát s kozím sýrem', description: 'Kozí sýr v panko strouhance, trhané listy, červená řepa, ořechy.', price: 260 },
    ],
  },
  {
    id: 'smazena-klasika',
    title: 'Smažená klasika',
    items: [
      { name: '150 g Smažený eidam s tatarkou', description: 'Vařené brambory, hranolky nebo krokety.', price: 210 },
      { name: '150 g Smažené kuřecí řízečky', description: 'Vařené brambory, hranolky nebo krokety.', price: 210 },
      { name: '150 g Smažený kuřecí řízek Paganini', description: 'Plněný šunkou a sýrem, vařené brambory, hranolky nebo krokety.', price: 220 },
    ],
  },
  {
    id: 'ceska-kuchyne',
    title: 'Česká kuchyně',
    items: [
      { name: '200 g Vepřová líčka na červeném víně', description: 'Šlehaná bramborová kaše, mrkev na másle.', price: 270 },
      { name: '180 g Kuřecí prso s máslovou mrkví', description: 'Petrželové pyré, silná omáčka.', price: 250 },
      { name: '150 g Hovězí svíčková na smetaně', description: 'Houskový knedlík, brusinky, šlehačka.', price: 200 },
      { name: '600 g Grilované vepřové koleno', description: 'Křen, hořčice, nakládaná zelenina.', price: 279 },
      { name: '600 g Pečená pikantní žebra Velvet', description: 'Marináda, křen, hořčice, nakládaná zelenina.', price: 279 },
      { name: '200 g Masová pánev', description: 'Vepřové a kuřecí maso, restovaná zelenina, sladkokyselá omáčka, bramboráčky.', price: 210 },
    ],
  },
  {
    id: 'burger-a-bbq',
    title: 'Burger a BBQ',
    items: [
      { name: '180 g Klasik burger', description: 'Hovězí maso, listy, slanina, majonéza, kečup, cheddar, hranolky, coleslaw.', price: 290 },
      { name: '180 g Trhaný burger', description: 'Trhané vepřové, listy, cheddar, zauzená majonéza, BBQ, hranolky, coleslaw.', price: 290 },
      { name: '250 g Špalek vepřové krkovice v BBQ', description: 'Pomalu tažená krkovice, BBQ omáčka, hranolky, coleslaw.', price: 270 },
    ],
  },
  {
    id: 'samostatne-prilohy',
    title: 'Samostatné přílohy',
    items: [
      { name: '200 g Teplé bramborové chipsy', description: '', price: 90 },
      { name: '200 g Smažené cibulové kroužky', description: '', price: 90 },
      { name: '300 g Steakové hranolky', description: '', price: 90 },
    ],
  },
  {
    id: 'grilovana-masa',
    title: 'Grilovaná masa',
    items: [
      { name: '300 g Kotleta s kostí na grilu', description: 'Marinovaná v hořčici, omáčka z pečeného česneku.', price: 250 },
      { name: '350 g Steak z vepřové krkovice', description: 'Restovaná cibule, silná omáčka.', price: 250 },
      { name: '250 g Pomalu pečená krkovice', description: 'Hříbkový krém.', price: 230 },
      { name: '200 g Panenka sous vide', description: 'Pepřová omáčka.', price: 230 },
      { name: '150 g Kuřecí steak na grilu', description: 'Grilovaná zelenina.', price: 230 },
    ],
  },
  {
    id: 'pro-deti',
    title: 'Pro děti',
    items: [
      { name: '75 g Hovězí svíčková na smetaně', description: 'Houskový knedlík, brusinky, šlehačka.', price: 150 },
      { name: '75 g Smažený eidam s tatarkou', description: 'Vařené brambory, hranolky nebo krokety.', price: 150 },
      { name: '100 g Smažené kuřecí řízečky', description: 'Bramborová kaše, hranolky nebo krokety.', price: 150 },
    ],
  },
  {
    id: 'prilohy',
    title: 'Přílohy',
    items: [
      { name: '200 g Steakové hranolky', description: '', price: 55 },
      { name: '200 g Krokety', description: '', price: 55 },
      { name: '200 g Grilovaná zelenina', description: '', price: 70 },
      { name: '3 ks Bramboráčky', description: '', price: 60 },
      { name: '200 g Šťouchané brambory', description: '', price: 60 },
      { name: '200 g Zeleninový salát', description: '', price: 60 },
      { name: '100 g Coleslaw salát', description: '', price: 30 },
      { name: '1 ks Toast', description: '', price: 10 },
      { name: 'Chléb (půl krajíce)', description: '', price: 5 },
      { name: 'Topinka', description: '', price: 10 },
    ],
  },
  {
    id: 'omacky',
    title: 'Omáčky',
    items: [
      { name: 'Tatarská', description: '', price: 40 },
      { name: 'Česneková', description: '', price: 40 },
      { name: 'Cheddarová', description: '', price: 40 },
      { name: 'Barbecue', description: '', price: 40 },
      { name: 'Grilovací', description: '', price: 40 },
    ],
  },
  {
    id: 'dezerty',
    title: 'Dezerty',
    items: [
      { name: 'Domácí perník', description: 'S citrónovým krémem a drobenkou.', price: 55 },
    ],
  },
];

export const DEFAULT_DRINK_MENU = [
  {
    id: 'aperitiv',
    title: 'Aperitiv',
    items: [
      { name: '8 cl Martini Bianco', description: '', price: 60 },
      { name: '8 cl Martini Dry', description: '', price: 60 },
    ],
  },
  {
    id: 'whiskey',
    title: 'Whiskey',
    items: [
      { name: '4 cl Jameson Irish', description: '', price: 80 },
      { name: '4 cl Tullamore Dew', description: '', price: 80 },
      { name: "4 cl Jack Daniel's", description: '', price: 90 },
      { name: "4 cl Jack Daniel's Honey", description: '', price: 90 },
    ],
  },
  {
    id: 'destilaty',
    title: 'Destiláty',
    items: [
      { name: '4 cl Amundsen vodka', description: '', price: 50 },
      { name: '4 cl Finlandia vodka', description: '', price: 60 },
      { name: '4 cl Spiš originál hruška', description: '', price: 65 },
      { name: '4 cl Spiš originál švestka', description: '', price: 65 },
    ],
  },
  {
    id: 'rum',
    title: 'Rum',
    items: [
      { name: '4 cl Republica', description: '', price: 55 },
      { name: '4 cl Tuzemský', description: '', price: 45 },
      { name: '4 cl Captain Morgan', description: '', price: 65 },
      { name: '4 cl Legendario Elixir De Cuba', description: '', price: 90 },
      { name: '4 cl Che Guevara', description: '', price: 50 },
    ],
  },
  {
    id: 'gin',
    title: 'Gin',
    items: [
      { name: '4 cl Bombay', description: '', price: 70 },
      { name: '4 cl Gordon Gin růžový', description: '', price: 70 },
    ],
  },
  {
    id: 'likery',
    title: 'Likéry',
    items: [
      { name: '4 cl Becherovka', description: '', price: 55 },
      { name: '4 cl Becherovka Lemond', description: '', price: 55 },
      { name: '4 cl Fernet Stock', description: '', price: 55 },
      { name: '4 cl Fernet Stock Citrus', description: '', price: 55 },
      { name: '4 cl Jägermeister', description: '', price: 75 },
      { name: '4 cl Baileys', description: '', price: 60 },
      { name: '4 cl Vaječný likér', description: '', price: 45 },
      { name: '4 cl Griotka', description: '', price: 30 },
      { name: '4 cl Peprmintový likér', description: '', price: 45 },
    ],
  },
  {
    id: 'pivo',
    title: 'Pivo',
    items: [
      { name: '0,5 l Pilsner Urquell', description: '', price: 66 },
      { name: '0,3 l Pilsner Urquell', description: '', price: 45 },
      { name: 'Šnyt Pilsner Urquell', description: '', price: 45 },
      { name: '0,5 l Gambrinus 10°', description: '', price: 46 },
      { name: '0,3 l Gambrinus 10°', description: '', price: 29 },
      { name: 'Šnyt Gambrinus 10°', description: '', price: 35 },
      { name: '0,5 l Radegast Birell (nealko)', description: '', price: 55 },
      { name: '0,3 l Radegast Birell (nealko)', description: '', price: 33 },
      { name: '0,5 l Kozel 11°', description: '', price: 48 },
      { name: '0,3 l Kozel 11°', description: '', price: 31 },
      { name: '0,5 l Černý Kozel', description: '', price: 55 },
      { name: '0,3 l Černý Kozel', description: '', price: 33 },
      { name: '0,5 l Řezané', description: '', price: 55 },
      { name: '0,3 l Řezané', description: '', price: 33 },
      { name: '0,5 l Pomelo–grep', description: '', price: 55 },
      { name: '0,3 l Pomelo–grep', description: '', price: 33 },
      { name: '0,33 l Jablečný cider', description: '', price: 50 },
    ],
  },
  {
    id: 'bile-vino',
    title: 'Bílé víno',
    items: [
      { name: '0,25 l Chardonnay suché', description: '', price: 75 },
      { name: '0,25 l Rulandské šedé polosuché', description: '', price: 75 },
      { name: '0,25 l Irsai Oliver polosladké', description: '', price: 75 },
    ],
  },
  {
    id: 'cervene-vino',
    title: 'Červené víno',
    items: [
      { name: '0,25 l Cabernet franc suché', description: '', price: 75 },
    ],
  },
  {
    id: 'sumive-vino',
    title: 'Šumivé víno',
    items: [
      { name: '0,1 l Prosecco suché', description: '', price: 45 },
    ],
  },
  {
    id: 'ovocne-vino',
    title: 'Ovocné víno',
    items: [
      { name: '0,2 l Grepino s plátkem pomeranče nebo grepu', description: '9,5 % alkoholu.', price: 50 },
    ],
  },
  {
    id: 'nealkoholicke',
    title: 'Nealkoholické nápoje',
    items: [
      { name: '0,5 l Kofola rozlévaná', description: '', price: 55 },
      { name: '0,3 l Kofola rozlévaná', description: '', price: 33 },
      { name: '0,2 l Soda', description: '', price: 10 },
      { name: '0,25 l Natura', description: '', price: 45 },
      { name: '0,25 l Tonic', description: '', price: 63 },
      { name: '0,3 l Sprite', description: '', price: 63 },
      { name: '0,3 l Fanta', description: '', price: 63 },
      { name: '0,3 l Coca-Cola Zero', description: '', price: 63 },
      { name: '0,2 l Cappy džus', description: '', price: 50 },
      { name: '0,25 l Red Bull', description: '', price: 70 },
      { name: '0,5 l Džusový střik', description: '', price: 60 },
      { name: '0,5 l Džbánek vody', description: '', price: 25 },
      { name: '0,5 l Malinovka', description: '', price: 55 },
      { name: '0,3 l Malinovka', description: '', price: 33 },
      { name: '0,5 l Pomerančová voda', description: '', price: 35 },
      { name: '0,5 l Citrónová voda', description: '', price: 35 },
    ],
  },
  {
    id: 'teple-napoje',
    title: 'Teplé nápoje',
    items: [
      { name: '7 g Čaj Dilmah', description: '', price: 50 },
      { name: '7 g Káva espresso', description: '', price: 55 },
      { name: '7 g Latte macchiato', description: '', price: 65 },
      { name: '7 g Káva vídeňská', description: '', price: 65 },
      { name: '7 g Káva irská (2 cl whiskey)', description: '', price: 95 },
      { name: '7 g Káva alžírská 2 cl', description: '', price: 70 },
      { name: '7 g Káva turecká', description: '', price: 55 },
      { name: '7 g Cappuccino', description: '', price: 65 },
      { name: '4 cl Grog (citron)', description: '', price: 50 },
      { name: '0,2 l Svařené víno (citron)', description: '', price: 62 },
      { name: '4 cl Svařená griotka', description: '', price: 45 },
      { name: '4 cl Svařený punč', description: '', price: 45 },
      { name: '0,25 l Svařený hruškový džus', description: '', price: 55 },
      { name: '0,2 l Horký ovocný nápoj', description: '', price: 45 },
      { name: '1 ks Med', description: '', price: 10 },
    ],
  },
];

export function cloneCatalogMenu(menu) {
  return menu.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item })),
  }));
}
