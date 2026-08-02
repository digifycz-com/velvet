/* ==========================================================================
   PASÁŽ VELVET – VÝCHOZÍ OBSAH FOTOGALERIE
   Galerie je rozdělená na kategorie jídel; jedna dlaždice = jedna kategorie.
   Tohle je záloha pro případ, že dokument v Firestore ještě neexistuje –
   administrace obsah přepisuje, tenhle soubor se neupravuje ručně.
   ========================================================================== */

export const GALLERY_DOC = 'gallery';

export const DEFAULT_GALLERY = [
  {
    id: 'na-zacatek',
    title: 'Na začátek',
    photos: [
      { url: '/images/gallery/full/velvet-02.webp', thumbUrl: '/images/gallery/thumb/velvet-02.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
      { url: '/images/gallery/full/velvet-01.webp', thumbUrl: '/images/gallery/thumb/velvet-01.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
      { url: '/images/gallery/full/velvet-05.webp', thumbUrl: '/images/gallery/thumb/velvet-05.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
      { url: '/images/gallery/full/velvet-03.webp', thumbUrl: '/images/gallery/thumb/velvet-03.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
      { url: '/images/gallery/full/velvet-04.webp', thumbUrl: '/images/gallery/thumb/velvet-04.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
      { url: '/images/gallery/full/velvet-06.webp', thumbUrl: '/images/gallery/thumb/velvet-06.webp', alt: 'Paštika z kuřecích jater s brusinkovou omáčkou a opečeným chlebem' },
    ],
  },
  {
    id: 'salaty',
    title: 'Saláty',
    photos: [
      { url: '/images/gallery/full/velvet-42.webp', thumbUrl: '/images/gallery/thumb/velvet-42.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
      { url: '/images/gallery/full/velvet-46.webp', thumbUrl: '/images/gallery/thumb/velvet-46.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
      { url: '/images/gallery/full/velvet-43.webp', thumbUrl: '/images/gallery/thumb/velvet-43.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
      { url: '/images/gallery/full/velvet-45.webp', thumbUrl: '/images/gallery/thumb/velvet-45.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
      { url: '/images/gallery/full/velvet-47.webp', thumbUrl: '/images/gallery/thumb/velvet-47.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
      { url: '/images/gallery/full/velvet-44.webp', thumbUrl: '/images/gallery/thumb/velvet-44.webp', alt: 'Salát s kozím sýrem v panko strouhance, trhanými listy a červenou řepou' },
    ],
  },
  {
    id: 'grilovana-masa',
    title: 'Grilovaná masa',
    photos: [
      { url: '/images/gallery/full/velvet-12.webp', thumbUrl: '/images/gallery/thumb/velvet-12.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-08.webp', thumbUrl: '/images/gallery/thumb/velvet-08.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-11.webp', thumbUrl: '/images/gallery/thumb/velvet-11.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-09.webp', thumbUrl: '/images/gallery/thumb/velvet-09.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-10.webp', thumbUrl: '/images/gallery/thumb/velvet-10.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-13.webp', thumbUrl: '/images/gallery/thumb/velvet-13.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-07.webp', thumbUrl: '/images/gallery/thumb/velvet-07.webp', alt: 'Grilované vepřové koleno s křenem, hořčicí a nakládanou zeleninou' },
      { url: '/images/gallery/full/velvet-17.webp', thumbUrl: '/images/gallery/thumb/velvet-17.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-19.webp', thumbUrl: '/images/gallery/thumb/velvet-19.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-14.webp', thumbUrl: '/images/gallery/thumb/velvet-14.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-15.webp', thumbUrl: '/images/gallery/thumb/velvet-15.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-20.webp', thumbUrl: '/images/gallery/thumb/velvet-20.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-16.webp', thumbUrl: '/images/gallery/thumb/velvet-16.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
      { url: '/images/gallery/full/velvet-18.webp', thumbUrl: '/images/gallery/thumb/velvet-18.webp', alt: 'Pečená pikantní žebra Velvet s nakládanou cibulkou a okurkami' },
    ],
  },
  {
    id: 'burger-a-bbq',
    title: 'Burger a BBQ',
    photos: [
      { url: '/images/gallery/full/velvet-22.webp', thumbUrl: '/images/gallery/thumb/velvet-22.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-21.webp', thumbUrl: '/images/gallery/thumb/velvet-21.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-26.webp', thumbUrl: '/images/gallery/thumb/velvet-26.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-24.webp', thumbUrl: '/images/gallery/thumb/velvet-24.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-25.webp', thumbUrl: '/images/gallery/thumb/velvet-25.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-23.webp', thumbUrl: '/images/gallery/thumb/velvet-23.webp', alt: 'Trhaný burger v sezamové housce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-28.webp', thumbUrl: '/images/gallery/thumb/velvet-28.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-27.webp', thumbUrl: '/images/gallery/thumb/velvet-27.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-29.webp', thumbUrl: '/images/gallery/thumb/velvet-29.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-31.webp', thumbUrl: '/images/gallery/thumb/velvet-31.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-33.webp', thumbUrl: '/images/gallery/thumb/velvet-33.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-30.webp', thumbUrl: '/images/gallery/thumb/velvet-30.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-32.webp', thumbUrl: '/images/gallery/thumb/velvet-32.webp', alt: 'Klasik burger s cheddarem, slaninou a hranolky' },
      { url: '/images/gallery/full/velvet-40.webp', thumbUrl: '/images/gallery/thumb/velvet-40.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-36.webp', thumbUrl: '/images/gallery/thumb/velvet-36.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-37.webp', thumbUrl: '/images/gallery/thumb/velvet-37.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-38.webp', thumbUrl: '/images/gallery/thumb/velvet-38.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-34.webp', thumbUrl: '/images/gallery/thumb/velvet-34.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-35.webp', thumbUrl: '/images/gallery/thumb/velvet-35.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-39.webp', thumbUrl: '/images/gallery/thumb/velvet-39.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-41.webp', thumbUrl: '/images/gallery/thumb/velvet-41.webp', alt: 'Špalek vepřové krkovice v BBQ omáčce s hranolky a coleslawem' },
      { url: '/images/gallery/full/velvet-49.webp', thumbUrl: '/images/gallery/thumb/velvet-49.webp', alt: 'Trhaný BBQ talíř s hranolky, cheddarem, slaninou a jalapeños' },
      { url: '/images/gallery/full/velvet-48.webp', thumbUrl: '/images/gallery/thumb/velvet-48.webp', alt: 'Trhaný BBQ talíř s hranolky, cheddarem, slaninou a jalapeños' },
      { url: '/images/gallery/full/velvet-50.webp', thumbUrl: '/images/gallery/thumb/velvet-50.webp', alt: 'Trhaný BBQ talíř s hranolky, cheddarem, slaninou a jalapeños' },
    ],
  },
];
