// UI chrome strings (everything translatable that is not in content.json)
// and the t() resolver used for both chrome and content fields.
import { currentLang } from './settings.js';

export const CHROME = {
  subtitle: {
    en: 'Essential Chinese for apps, food, travel & signs',
    it: 'Cinese essenziale per app, cibo, viaggi e insegne'
  },
  aboutTagline: {
    en: 'hàn (汉) = Chinese · handy = useful',
    it: 'hàn (汉) = cinese · handy = utile'
  },
  aboutTips: {
    en: '<li><strong>Tap</strong> a card to hear it spoken</li>'
      + '<li><strong>Hold</strong> a card to copy the hanzi</li>'
      + '<li><strong>Swipe</strong> left / right to change tab</li>'
      + '<li><strong>☆</strong> saves a card to Favorites · <strong>📖</strong> opens it in Pleco</li>'
      + '<li><strong>拼</strong> hides pinyin · <strong>?</strong> starts quiz mode</li>'
      + '<li>Works fully <strong>offline</strong> once installed</li>',
    it: '<li><strong>Tocca</strong> una carta per ascoltarla</li>'
      + '<li><strong>Tieni premuto</strong> per copiare gli hanzi</li>'
      + '<li><strong>Scorri</strong> a sinistra / destra per cambiare scheda</li>'
      + '<li><strong>☆</strong> salva una carta nei Preferiti · <strong>📖</strong> la apre in Pleco</li>'
      + '<li><strong>拼</strong> nasconde il pinyin · <strong>?</strong> avvia la modalità quiz</li>'
      + '<li>Funziona completamente <strong>offline</strong> una volta installata</li>'
  },
  ttsUnsupported: {
    en: 'Speech is not supported in this browser',
    it: 'La sintesi vocale non è supportata in questo browser'
  },
  noZhVoice: {
    en: 'No Chinese voice installed, so hanzi may be read wrong. iOS: Settings → Accessibility → Spoken Content → Voices → Chinese. Android: Settings → Text-to-speech.',
    it: 'Nessuna voce cinese installata: gli hanzi potrebbero essere letti male. iOS: Impostazioni → Accessibilità → Contenuto letto → Voci → Cinese. Android: Impostazioni → Sintesi vocale.'
  },
  quizHint: {
    en: 'tap to reveal',
    it: 'tocca per scoprire'
  },
  copied: {
    en: 'Copied',
    it: 'Copiato'
  },
  copyFailed: {
    en: 'Copy not available',
    it: 'Copia non disponibile'
  },
  updateReady: {
    en: 'New version ready · tap to reload',
    it: 'Nuova versione pronta · tocca per ricaricare'
  },
  installHint: {
    en: '<strong>Works offline!</strong> Tap Safari\'s Share button → <strong>Add to Home Screen</strong> to install as an app. Perfect for your trip.',
    it: '<strong>Funziona offline!</strong> Tocca il pulsante Condividi di Safari → <strong>Aggiungi alla schermata Home</strong> per installarla come app. Perfetta per il tuo viaggio.'
  },
  installHintAndroid: {
    en: '<strong>Works offline!</strong> Tap <strong>Install</strong> or use your browser menu → <strong>Add to Home Screen</strong>.',
    it: '<strong>Funziona offline!</strong> Tocca <strong>Installa</strong> o usa il menu del browser → <strong>Aggiungi alla schermata Home</strong>.'
  },
  installBtnLabel: {
    en: 'Install',
    it: 'Installa'
  },
  plecoLabel: { en: 'Look up in Pleco', it: 'Cerca in Pleco' },
  favoritesEmpty: {
    en: 'Tap the ☆ on any card to save it here.',
    it: 'Tocca la ☆ su una carta per salvarla qui.'
  },
  searchPlaceholder: {
    en: 'Search…',
    it: 'Cerca…'
  },
  loadError: {
    en: 'Failed to load content. Please reconnect and refresh.',
    it: 'Impossibile caricare i contenuti. Riconnettiti e aggiorna.'
  },
  // ── Custom phrases (我的 tab) ──
  customTabLabel: { en: 'My', it: 'Le mie' },
  customSectionTitle: { en: 'My phrases', it: 'Le mie frasi' },
  customEmpty: {
    en: 'Your own phrases live here.<br>Tap <strong>Add</strong> to write one, or <strong>Import</strong> a JSON file exported from Hàndy.',
    it: 'Qui vivono le tue frasi.<br>Tocca <strong>Aggiungi</strong> per scriverne una, o <strong>Importa</strong> un file JSON esportato da Hàndy.'
  },
  addBtn: { en: 'Add', it: 'Aggiungi' },
  importBtn: { en: 'Import', it: 'Importa' },
  exportBtn: { en: 'Export', it: 'Esporta' },
  edit: { en: 'Edit', it: 'Modifica' },
  editDone: { en: 'Done', it: 'Fine' },
  deleteAll: { en: 'Delete all', it: 'Elimina tutto' },
  deleteAllConfirm: { en: 'Tap again to delete all', it: 'Tocca di nuovo per eliminare tutto' },
  deletedAll: { en: 'All phrases deleted', it: 'Tutte le frasi eliminate' },
  removeLabel: { en: 'Remove phrase', it: 'Rimuovi frase' },
  fieldHanzi: { en: 'Hanzi', it: 'Hanzi' },
  fieldPinyin: { en: 'Pinyin', it: 'Pinyin' },
  fieldMeaning: { en: 'Meaning', it: 'Significato' },
  fieldMeaningPlaceholder: { en: 'hello', it: 'ciao' },
  fieldNote: { en: 'Note', it: 'Nota' },
  fieldNotePlaceholder: { en: 'when to use it, who said it…', it: 'quando usarla, chi l\'ha detta…' },
  fieldOptional: { en: 'optional', it: 'opzionale' },
  addSubmit: { en: 'Add', it: 'Aggiungi' },
  added: { en: 'Added', it: 'Aggiunta' },
  addDuplicate: { en: 'Already in your phrases', it: 'Già tra le tue frasi' },
  addNoHanzi: { en: 'Hanzi must contain Chinese characters', it: 'Gli hanzi devono contenere caratteri cinesi' },
  importAdded: { en: 'added', it: 'aggiunte' },
  importSkipped: { en: 'skipped (empty or duplicate)', it: 'saltate (vuote o duplicate)' },
  importNothing: { en: 'Nothing to import', it: 'Niente da importare' },
  exportEmpty: { en: 'Nothing to export yet', it: 'Ancora niente da esportare' }
};

export function t(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[currentLang] || field.en || Object.values(field)[0] || '';
}

// Push CHROME strings into the static markup (data-i18n / data-i18n-html).
export function applyChrome() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (CHROME[key]) el.textContent = CHROME[key][currentLang];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (CHROME[key]) el.innerHTML = CHROME[key][currentLang];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (CHROME[key]) el.placeholder = CHROME[key][currentLang];
  });
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  const si = document.getElementById('searchInput');
  if (si) si.placeholder = CHROME.searchPlaceholder[currentLang];
  document.documentElement.style.setProperty(
    '--quiz-hint', JSON.stringify(t(CHROME.quizHint)));
}
