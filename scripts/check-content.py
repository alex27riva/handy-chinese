#!/usr/bin/env python3
"""Validate content.json (and a few cross-file invariants). Exit 1 on any error.

Checks
  - JSON parses; top level is {"tabs": [...]}
  - tab: unique id, hanziLabel, known type, exactly one of sections/subsections
  - every translatable field (tab.label, tab.intro, subsection.title, section.title,
    entry.meaning, entry.description) is {en, it} with non-empty strings
  - entries: hanzi + pinyin non-empty; pinyin uses tone diacritics, never digits
  - vocab / phrase entries have meaning; app entries have name + description
  - no duplicate hanzi within a tab (favorites are keyed tabId:hanzi)
  - sw.js ASSETS lists every js/*.js file
  - CHROME in js/i18n.js has both en and it for every key

Usage: python3 scripts/check-content.py   (from the repo root or anywhere)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ("en", "it")
TAB_TYPES = {"vocab", "phrase", "app"}
errors = []


def err(path, msg):
    errors.append(f"{path}: {msg}")


def check_i18n(value, path, required=True):
    if value is None:
        if required:
            err(path, "missing")
        return
    if not isinstance(value, dict):
        err(path, f"must be an {{en, it}} object, got {type(value).__name__}")
        return
    for lang in LANGS:
        v = value.get(lang)
        if not isinstance(v, str) or not v.strip():
            err(path, f"missing or empty '{lang}'")
    extra = set(value) - set(LANGS)
    if extra:
        err(path, f"unexpected language keys {sorted(extra)}")


def check_text(value, path):
    if not isinstance(value, str) or not value.strip():
        err(path, "missing or empty")
        return False
    return True


def check_pinyin(value, path):
    if not check_text(value, path):
        return
    if re.search(r"\d", value):
        err(path, f"numbered tones in {value!r}; use diacritics (nǐ hǎo)")
    if value != value.strip() or "  " in value:
        err(path, f"stray whitespace in {value!r}")


def check_entry(entry, tab_type, path, seen_hanzi):
    if not isinstance(entry, dict):
        err(path, "entry must be an object")
        return
    if check_text(entry.get("hanzi"), f"{path}.hanzi"):
        h = entry["hanzi"]
        if h in seen_hanzi:
            err(f"{path}.hanzi", f"duplicate {h!r} in this tab (first at {seen_hanzi[h]})")
        else:
            seen_hanzi[h] = path
    check_pinyin(entry.get("pinyin"), f"{path}.pinyin")
    if tab_type == "app":
        check_text(entry.get("name"), f"{path}.name")
        check_i18n(entry.get("description"), f"{path}.description")
    else:
        check_i18n(entry.get("meaning"), f"{path}.meaning")


def check_section(sec, tab_type, path, seen_hanzi):
    if not isinstance(sec, dict):
        err(path, "section must be an object")
        return
    check_i18n(sec.get("title"), f"{path}.title")
    entries = sec.get("entries")
    if not isinstance(entries, list) or not entries:
        err(f"{path}.entries", "must be a non-empty array")
        return
    for i, e in enumerate(entries):
        check_entry(e, tab_type, f"{path}.entries[{i}]", seen_hanzi)


def check_tab(tab, i, seen_ids):
    path = f"tabs[{i}]"
    if not isinstance(tab, dict):
        err(path, "tab must be an object")
        return
    tid = tab.get("id")
    if check_text(tid, f"{path}.id"):
        if tid in seen_ids:
            err(f"{path}.id", f"duplicate id {tid!r}")
        seen_ids.add(tid)
        path = f"tabs[{tid}]"
    check_i18n(tab.get("label"), f"{path}.label")
    check_text(tab.get("hanziLabel"), f"{path}.hanziLabel")
    check_i18n(tab.get("intro"), f"{path}.intro", required=False)
    tab_type = tab.get("type")
    if tab_type not in TAB_TYPES:
        err(f"{path}.type", f"{tab_type!r} not in {sorted(TAB_TYPES)}")
    if "cardClass" in tab:
        err(f"{path}.cardClass", "removed in v0.16.5; use 'type' (vocab | phrase | app)")
    has_sections, has_subs = "sections" in tab, "subsections" in tab
    if has_sections == has_subs:
        err(path, "must have exactly one of 'sections' or 'subsections'")
        return
    seen_hanzi = {}
    if has_subs:
        subs = tab["subsections"]
        if not isinstance(subs, list) or not subs:
            err(f"{path}.subsections", "must be a non-empty array")
            return
        for j, sub in enumerate(subs):
            sp = f"{path}.subsections[{j}]"
            if not isinstance(sub, dict):
                err(sp, "subsection must be an object")
                continue
            check_i18n(sub.get("title"), f"{sp}.title")
            secs = sub.get("sections")
            if not isinstance(secs, list) or not secs:
                err(f"{sp}.sections", "must be a non-empty array")
                continue
            for k, sec in enumerate(secs):
                check_section(sec, tab_type, f"{sp}.sections[{k}]", seen_hanzi)
    else:
        secs = tab["sections"]
        if not isinstance(secs, list) or not secs:
            err(f"{path}.sections", "must be a non-empty array")
            return
        for k, sec in enumerate(secs):
            check_section(sec, tab_type, f"{path}.sections[{k}]", seen_hanzi)


def check_content():
    p = ROOT / "content.json"
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        err("content.json", f"cannot parse: {e}")
        return
    if isinstance(data, dict):
        check_tips(data)
    tabs = data.get("tabs") if isinstance(data, dict) else None
    if not isinstance(tabs, list) or not tabs:
        err("content.json", "top level must be {\"tabs\": [...]} with at least one tab")
        return
    seen_ids = set()
    for i, tab in enumerate(tabs):
        check_tab(tab, i, seen_ids)


def check_tips(data):
    """Top-level 'tips': the mascot's rotating advice list (js/tips.js)."""
    tips = data.get("tips")
    if not isinstance(tips, list) or not tips:
        err("content.json", "'tips' must be a non-empty array")
        return
    for i, tip in enumerate(tips):
        check_i18n(tip, f"tips[{i}]")


def check_sw_assets():
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    m = re.search(r"const ASSETS = \[(.*?)\];", sw, re.S)
    if not m:
        err("sw.js", "ASSETS array not found")
        return
    assets = set(re.findall(r"'([^']+)'", m.group(1)))
    for f in sorted((ROOT / "js").glob("*.js")):
        rel = f"./js/{f.name}"
        if rel not in assets:
            err("sw.js", f"ASSETS is missing {rel}")
    for a in assets:
        if not (ROOT / a).exists():
            err("sw.js", f"ASSETS lists {a} but the file does not exist")


def check_chrome():
    src = (ROOT / "js" / "i18n.js").read_text(encoding="utf-8")
    m = re.search(r"export const CHROME = \{(.*?)\n\};", src, re.S)
    if not m:
        err("js/i18n.js", "CHROME map not found")
        return
    # each key is "  name: {" at 2-space indent; its block ends at the next "  }"
    for key, body in re.findall(r"\n  (\w+): \{(.*?)\n  \}", m.group(1), re.S):
        for lang in LANGS:
            if not re.search(rf"^\s*{lang}: ", body, re.M):
                err("js/i18n.js", f"CHROME.{key} has no '{lang}' string")


def main():
    check_content()
    check_sw_assets()
    check_chrome()
    if errors:
        print(f"{len(errors)} problem(s):")
        for e in errors:
            print("  " + e)
        return 1
    print("content ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
