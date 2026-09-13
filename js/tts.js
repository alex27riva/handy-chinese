// Text-to-speech via window.speechSynthesis. Prefers a zh-CN voice.
import { store } from './settings.js';
import { CHROME, t } from './i18n.js';
import { showToast } from './toast.js';

export const synth = window.speechSynthesis;
let zhVoice = null;
function pickVoice() {
  const voices = synth ? synth.getVoices() : [];
  zhVoice = voices.find(v => v.lang === 'zh-CN')
         || voices.find(v => v.lang.startsWith('zh-CN'))
         || voices.find(v => v.lang.startsWith('zh'))
         || null;
}
pickVoice();
if (synth && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = pickVoice;
}

// One-time hint when the device has voices but none for Chinese (iOS reads
// hanzi with the default voice then). Checked on first tap, when the voice
// list is guaranteed to be populated.
const VOICE_HINT_KEY = 'voiceHintShown';
function maybeVoiceHint() {
  if (zhVoice || store.get(VOICE_HINT_KEY) === '1') return;
  pickVoice();
  if (zhVoice || synth.getVoices().length === 0) return;
  store.set(VOICE_HINT_KEY, '1');
  showToast(t(CHROME.noZhVoice), { ms: 6000, long: true });
}

let currentCard = null;
export function speak(text, card) {
  if (!synth) {
    showToast(t(CHROME.ttsUnsupported));
    return;
  }
  maybeVoiceHint();
  synth.cancel();
  if (currentCard) currentCard.classList.remove('speaking');

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  if (zhVoice) utter.voice = zhVoice;
  utter.rate = 0.85;
  utter.pitch = 1;

  utter.onstart = () => {
    card.classList.add('speaking');
    currentCard = card;
  };
  utter.onend = utter.onerror = () => {
    card.classList.remove('speaking');
    if (currentCard === card) currentCard = null;
  };

  synth.speak(utter);
}
