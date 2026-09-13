// UI chrome strings (everything translatable that is not in content.json)
// and the t() resolver used for both chrome and content fields.
import { currentLang } from './settings.js';

export const CHROME = {
  subtitle: {
    en: 'Essential Chinese for apps, food, travel & visa-free destinations',
    it: 'Cinese essenziale per app, cibo, viaggi e destinazioni senza visto'
  },
  aboutTagline: {
    en: 'hàn (汉) = Chinese · handy = useful',
    it: 'hàn (汉) = cinese · handy = utile'
  },
  aboutTips: {
    en: '<li><strong>Tap</strong> a card to hear it spoken</li>'
      + '<li><strong>Hold</strong> a card to copy the hanzi</li>'
      + '<li><strong>Swipe</strong> left / right to change tab</li>'
      + '<li><strong>☆</strong> saves a card to Favorites</li>'
      + '<li><strong>拼</strong> hides pinyin · <strong>?</strong> starts quiz mode</li>'
      + '<li>Works fully <strong>offline</strong> once installed</li>',
    it: '<li><strong>Tocca</strong> una carta per ascoltarla</li>'
      + '<li><strong>Tieni premuto</strong> per copiare gli hanzi</li>'
      + '<li><strong>Scorri</strong> a sinistra / destra per cambiare scheda</li>'
      + '<li><strong>☆</strong> salva una carta nei Preferiti</li>'
      + '<li><strong>拼</strong> nasconde il pinyin · <strong>?</strong> avvia la modalità quiz</li>'
      + '<li>Funziona completamente <strong>offline</strong> una volta installata</li>'
  },
  ttsUnsupported: {
    en: 'Speech is not supported in this browser',
    it: 'La sintesi vocale non è supportata in questo browser'
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
  }
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
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  const si = document.getElementById('searchInput');
  if (si) si.placeholder = CHROME.searchPlaceholder[currentLang];
  document.documentElement.style.setProperty(
    '--quiz-hint', JSON.stringify(t(CHROME.quizHint)));
}
