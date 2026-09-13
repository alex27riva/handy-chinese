// Text-to-speech via window.speechSynthesis. Prefers a zh-CN voice.
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

let currentCard = null;
export function speak(text, card) {
  if (!synth) {
    showToast(t(CHROME.ttsUnsupported));
    return;
  }
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
