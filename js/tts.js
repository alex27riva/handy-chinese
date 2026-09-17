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
// iOS puts a page's audio in the 'ambient' session category, which the
// hardware silent switch mutes — speechSynthesis included, so cards stay
// silent unless the switch is flipped. Promoting the session to 'playback'
// lifts that, and has to happen inside a user gesture: it runs on the first
// speak() call, through the AudioSession API (Safari 16.4+) or, on older iOS,
// by keeping a silent looping <audio> element playing — an active media
// element promotes the session the same way.
let silentLoop = null;
let audioUnlocked = false;

// 0.2 s of 8-bit 8 kHz mono silence, built here so no asset needs precaching.
function silentWavUrl() {
  const samples = 1600;
  const buf = new ArrayBuffer(44 + samples);
  const view = new DataView(buf);
  const tag = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  tag(0, 'RIFF');       view.setUint32(4, 36 + samples, true);
  tag(8, 'WAVEfmt ');   view.setUint32(16, 16, true);  // fmt chunk size
  view.setUint16(20, 1, true);                         // PCM
  view.setUint16(22, 1, true);                         // mono
  view.setUint32(24, 8000, true);                      // sample rate
  view.setUint32(28, 8000, true);                      // byte rate
  view.setUint16(32, 1, true);                         // block align
  view.setUint16(34, 8, true);                         // bits per sample
  tag(36, 'data');      view.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128);                   // 8-bit silence is 0x80
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function unlockAudio() {
  if (audioUnlocked || !platform.ios) return;
  audioUnlocked = true;
  if (navigator.audioSession) {
    try { navigator.audioSession.type = 'playback'; return; } catch (e) {}
  }
  try {
    silentLoop = new Audio(silentWavUrl()); // kept referenced so it stays alive
    silentLoop.loop = true;
    silentLoop.play().catch(() => {});
  } catch (e) {}
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
  unlockAudio(); // synchronous, still inside the tap that got us here
  maybeVoiceHint();
  if (synth.speaking || synth.pending) cancelSpeech();
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

  currentUtter = utter;
  const wait = platform.firefox ? Math.max(0, CANCEL_SETTLE - (Date.now() - lastCancel)) : 0;
  if (wait) setTimeout(() => synth.speak(utter), wait);
  else synth.speak(utter);
}
