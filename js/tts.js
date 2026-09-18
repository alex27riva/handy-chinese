// Text-to-speech via window.speechSynthesis. Prefers a zh-CN voice.
import { store, platform } from './settings.js';
import { CHROME, t } from './i18n.js';
import { showToast } from './toast.js';

const synth = window.speechSynthesis;
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

// ── iOS ring/silent switch ─────────────────────────────────
// iOS 27 routes speechSynthesis as *system speech*, which the ring/silent
// switch mutes on its own. Verified on 27.0 with tts-test.html: utterances
// start and end normally but are inaudible, while plain <audio> and Web Audio
// from the same page stay audible, and neither navigator.audioSession =
// 'playback' nor a silent looping <audio> element lifts it — those promote the
// page's audio session, which system speech does not use. Nothing page-side
// can unmute it, so the app says so once instead. Drop this if Apple fixes it.
const SILENT_HINT_KEY = 'silentHintShown';
function maybeSilentHint() {
  if (!platform.ios || platform.safariMajor < 27) return;
  if (store.get(SILENT_HINT_KEY) === '1') return;
  store.set(SILENT_HINT_KEY, '1');
  showToast(t(CHROME.silentSwitch), { ms: 6000, long: true });
}

// ── Cancel / speak race ────────────────────────────────────
// Firefox (bug 1522074) swallows a speak() issued right after a cancel() —
// which is every tap that interrupts another card. Every cancel in the app
// goes through cancelSpeech() so speak() can wait the window out; other
// engines speak immediately.
const CANCEL_SETTLE = 300; // ms
let lastCancel = 0;
export function cancelSpeech() {
  if (!synth) return;
  lastCancel = Date.now();
  synth.cancel();
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
let currentUtter = null; // held so the engine's queue is not the only reference
export function speak(text, card) {
  if (!synth) {
    showToast(t(CHROME.ttsUnsupported));
    return;
  }
  maybeSilentHint();
  maybeVoiceHint();
  if (synth.speaking || synth.pending) cancelSpeech();
  if (currentCard) currentCard.classList.remove('speaking');

  if (!zhVoice) pickVoice(); // voice lists arrive late on Android
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  if (zhVoice) utter.voice = zhVoice;
  utter.rate = 0.85;
  utter.pitch = 1;

  utter.onstart = () => {
    card.classList.add('speaking');
    currentCard = card;
  };
  const done = () => {
    card.classList.remove('speaking');
    if (currentCard === card) currentCard = null;
  };
  utter.onend = done;
  // A failed utterance is otherwise completely silent — say why, except for the
  // two codes we cause ourselves by cancelling.
  utter.onerror = e => {
    done();
    const code = e && e.error;
    if (code && code !== 'interrupted' && code !== 'canceled') {
      showToast(t(CHROME.ttsFailed) + ' (' + code + ')', { ms: 4000, long: true });
    }
  };

  currentUtter = utter;
  const wait = platform.firefox ? Math.max(0, CANCEL_SETTLE - (Date.now() - lastCancel)) : 0;
  if (wait) setTimeout(() => synth.speak(utter), wait);
  else synth.speak(utter);
}
