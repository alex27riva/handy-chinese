// Custom phrases: the user's own entries, kept in localStorage (never in
// content.json) and rendered as the 我的 tab through the normal phrase-card
// path. This module owns the data (load / add / remove / export), the import
// sheet, and the per-tab action bar; render.js only asks for customTab().
import { store, platform } from './settings.js';
import { CHROME, t } from './i18n.js';
import { showToast } from './toast.js';
import { rerenderContent } from './render.js';

const KEY = 'customEntries';
export const CUSTOM_TAB_ID = 'my';
const EXPORT_FORMAT = 1;
const FIELDS = ['hanzi', 'pinyin', 'meaning', 'note'];
const HAS_CJK = /[\u3400-\u9fff\uf900-\ufaff]/; // CJK unified ideographs (+ext A, compatibility)

// ── Storage ────────────────────────────────────────────────
function clean(e) {
  if (!e || typeof e !== 'object') return null;
  const out = {};
  for (const f of FIELDS) {
    // meaning may arrive as {en, it} (content.json shape); custom entries keep plain strings
    const v = typeof e[f] === 'object' && e[f] !== null ? t(e[f]) : e[f];
    out[f] = typeof v === 'string' ? v.trim() : '';
  }
  return HAS_CJK.test(out.hanzi) && out.meaning ? out : null;
}

let entries = [];
try {
  const arr = JSON.parse(store.get(KEY, '[]'));
  if (Array.isArray(arr)) entries = arr.map(clean).filter(Boolean);
} catch (e) {}

function save() { store.set(KEY, JSON.stringify(entries)); }

export const customEntries = () => entries;

// Adds new entries (deduped by hanzi, first wins); returns counts for the toast.
export function addEntries(list) {
  const seen = new Set(entries.map(e => e.hanzi));
  let added = 0;
  list.forEach(raw => {
    const e = clean(raw);
    if (!e || seen.has(e.hanzi)) return;
    seen.add(e.hanzi);
    entries.push(e);
    added++;
  });
  if (added) save();
  return { added, skipped: list.length - added };
}

export function removeEntry(hanzi) {
  const n = entries.length;
  entries = entries.filter(e => e.hanzi !== hanzi);
  if (entries.length !== n) save();
}

export function clearEntries() {
  entries = [];
  save();
}

// ── Import parsing ─────────────────────────────────────────
// Accepts our export JSON ({entries: [...]}) or a bare array of entries.
export function parseImport(text) {
  try {
    const json = JSON.parse(String(text || ''));
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.entries)) return json.entries;
  } catch (e) {}
  return [];
}

// ── Export ─────────────────────────────────────────────────
function timestamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function exportEntries() {
  if (!entries.length) { showToast(t(CHROME.exportEmpty)); return; }
  const name = `handy_${timestamp()}.json`;
  const json = JSON.stringify({ app: 'handy', format: EXPORT_FORMAT, exported: new Date().toISOString(), entries }, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  // iOS (esp. installed PWAs) does not honour <a download>; the share sheet can save to Files.
  if (platform.ios && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(name);
}

// ── Synthetic tab (consumed by render.js) ──────────────────
export function customTab() {
  return {
    id: CUSTOM_TAB_ID,
    label: CHROME.customTabLabel,
    hanziLabel: '我的',
    type: 'phrase',
    custom: true,
    sections: entries.length ? [{ title: CHROME.customSectionTitle, entries }] : [],
  };
}

// ── Add sheet (form) + JSON import + action bar ────────────
const FORM_IDS = { hanzi: 'addHanzi', pinyin: 'addPinyin', meaning: 'addMeaning', note: 'addNote' };
const fieldEl = f => document.getElementById(FORM_IDS[f]);

function setSheet(open) {
  document.getElementById('addSheet').hidden = !open;
  document.body.classList.toggle('sheet-open', open);
  if (open) fieldEl('hanzi').focus();
}

// One phrase from the form. The sheet stays open with cleared fields so
// several phrases can be typed in a row; ✕ / Escape / backdrop close it.
function submitForm() {
  const raw = {};
  for (const f of FIELDS) raw[f] = fieldEl(f).value;
  const e = clean(raw);
  if (!e) { showToast(t(CHROME.addNoHanzi)); fieldEl('hanzi').focus(); return; }
  const { added } = addEntries([e]);
  if (!added) { showToast(t(CHROME.addDuplicate)); fieldEl('hanzi').focus(); return; }
  showToast(`${t(CHROME.added)} · ${e.hanzi}`);
  rerenderContent();
  for (const f of FIELDS) fieldEl(f).value = '';
  fieldEl('hanzi').focus();
}

function importFrom(text) {
  const list = parseImport(text);
  if (!list.length) { showToast(t(CHROME.importNothing)); return; }
  const { added, skipped } = addEntries(list);
  const msg = `${added} ${t(CHROME.importAdded)}` + (skipped ? ` · ${skipped} ${t(CHROME.importSkipped)}` : '');
  showToast(msg);
  if (added) rerenderContent();
}

let confirmTimer = null;
function resetDeleteAll(btn) {
  clearTimeout(confirmTimer);
  btn.dataset.confirm = '';
  btn.textContent = t(CHROME.deleteAll);
}

// Edit mode lives on the panel element, which rerenderContent() rebuilds, so
// it is re-applied after a removal to keep the ✕ buttons on screen.
function setEditing(panel, on) {
  panel.classList.toggle('editing', on);
  const edit = panel.querySelector('[data-custom-action="edit"]');
  if (edit) { edit.classList.toggle('active', on); edit.textContent = t(on ? CHROME.editDone : CHROME.edit); }
  const del = panel.querySelector('[data-custom-action="delete-all"]');
  if (del) { del.hidden = !on; resetDeleteAll(del); }
}

export function wireCustom() {
  const panels = document.getElementById('panels');
  // Action bar and per-card remove buttons are rebuilt by rerenderContent(), so delegate.
  panels.addEventListener('click', e => {
    const btn = e.target.closest('[data-custom-action]');
    if (!btn) return;
    const action = btn.dataset.customAction;
    if (action === 'add') setSheet(true);
    else if (action === 'import') document.getElementById('importFile').click();
    else if (action === 'export') exportEntries();
    else if (action === 'edit') {
      const panel = btn.closest('.tab-panel');
      setEditing(panel, !panel.classList.contains('editing'));
    } else if (action === 'delete-all') {
      // two taps within 3s, no native confirm() dialog
      if (btn.dataset.confirm) { clearEntries(); rerenderContent(); showToast(t(CHROME.deletedAll)); return; }
      btn.dataset.confirm = '1';
      btn.textContent = t(CHROME.deleteAllConfirm);
      confirmTimer = setTimeout(() => resetDeleteAll(btn), 3000);
    } else if (action === 'remove') {
      const card = btn.closest('[data-hanzi]');
      if (card) {
        removeEntry(card.dataset.hanzi);
        rerenderContent();
        const panel = document.getElementById('tab-' + CUSTOM_TAB_ID);
        if (panel && entries.length) setEditing(panel, true);
      }
    }
  });

  const sheet = document.getElementById('addSheet');
  sheet.addEventListener('click', e => { if (e.target === sheet) setSheet(false); });
  document.getElementById('addClose').addEventListener('click', () => setSheet(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) setSheet(false); });
  document.getElementById('addForm').addEventListener('submit', e => { e.preventDefault(); submitForm(); });
  document.getElementById('importFile').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { importFrom(await file.text()); }
    catch (err) { showToast(t(CHROME.importNothing)); }
  });
}

// Rendered by render.js at the top of the 我的 panel.
export function renderCustomBar(hasEntries) {
  const bar = document.createElement('div');
  bar.className = 'custom-bar';
  const mk = (action, key, extra = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + extra;
    b.dataset.customAction = action;
    b.textContent = t(CHROME[key]);
    return b;
  };
  bar.appendChild(mk('add', 'addBtn', ' btn-primary'));
  bar.appendChild(mk('import', 'importBtn'));
  if (hasEntries) {
    bar.appendChild(mk('export', 'exportBtn'));
    bar.appendChild(mk('edit', 'edit'));
    const del = mk('delete-all', 'deleteAll', ' btn-danger');
    del.hidden = true;
    bar.appendChild(del);
  }
  return bar;
}

export function renderCustomEmpty() {
  const empty = document.createElement('div');
  empty.className = 'custom-empty';
  const img = document.createElement('img');
  img.className = 'empty-mascot';
  img.src = './assets/mascot-help.svg';
  img.alt = '';
  empty.appendChild(img);
  const p = document.createElement('p');
  p.innerHTML = t(CHROME.customEmpty);
  empty.appendChild(p);
  return empty;
}
