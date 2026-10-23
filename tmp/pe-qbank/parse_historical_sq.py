# -*- coding: utf-8 -*-
"""Parse 2008-2020 old combined SQ/LQ extracts into structured short-answer JSON.

Rules:
- Year headers split sections; PAPER 1 → 卷一, PAPER 2 → 卷二.
- A question line contains (N分) marks. Lines after it (until the next question
  or header) are collected as the answer. Questions without answers are dropped.
- Questions referencing figures/tables (no images available) are dropped.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\MKPC\Desktop\studnet attendance")
EXTRACT = ROOT / "tmp" / "pe-qbank" / "extract"
OUT = EXTRACT / "parsed_historical_sq.json"

FILES = {
    1: "1.DSE歷年題目-體育的歷史和發展_ANS.txt",
    2: "2.DSE歷年題目_人體_ANS.txt",
    3: "3.DSE歷年題目_動作分析_ANS.txt",
    4: "4.DSE歷年題目-維持健康與活動表現的體適能和營養_ANS.txt",
    5: "5.DSE歷年題目_訓練法_ANS.txt",
    6: "6.DSE歷年題目_運動受傷_ANS.txt",
    7: "7.DSE歷年題目_運動心理技能_ANS.txt",
    8: "8.DSE歷年題目-體育對社會的影響_ANS.txt",
    9: "9.DSE歷年題目_體育運動管理_ans.txt",
}

LINE_RE = re.compile(r"^\[\d+\|[^\]]*\]\s?(.*)$")
YEAR_RE = re.compile(
    r"^(?:HKDSE\s+)?(?:(20\d{2})\s*年?\s*DSE|DSE\s*(20\d{2}))\s*"
    r"(練習卷|樣本試卷|樣本試題)?\s*(?:PAPER\s*)+(\d)", re.I)
HEADERISH_RE = re.compile(r"^(?:HK)?DSE\b|^20\d{2}\s*年?\s*DSE|PAPER\s*\d|^HKCEE|^HKALE|^總分|^滿分|^=", re.I)
TRUNC_TEXT_RE = re.compile(r"(討|述|明|出|釋|算|比)$")
TRUNC_ANS_RE = re.compile(r"^(論|述|明|出|釋|算|較)[。，]")
PART_Q_RE = re.compile(r"^[（(]\s*(?:[a-fA-F]|[ivx]{1,3})\s*(?:\(\s*[ivx]+\s*\))?\s*[）)]")
GLUE_RE = re.compile(r"[。；]\s*[（(][a-fA-F][）)]|。\s*(?:同意|不同意)\s*[:：︰∶]")
SCENARIO_RE = re.compile(r"^.{0,8}是一位|^.{0,8}是一名|^.{0,8}是一個(?:十六|三十|二十|\d)")
Q_IN_ANS_RE = re.compile(
    r"試(從|以|指出|描述|說明|解釋|討論|加以|建議)|就[（(]?[a-f][）)]?(?:\([ivx]+\))?部所答"
    r"|(指出|描述|解釋|說明)(該些|以下|上述)")
COLON_END_RE = re.compile(r"[:：︰∶]\s*$")
TRAIL_BAD_RE = re.compile(r"[,，、；]\s*$")
MARKS_RE = re.compile(r"[（\(]\s*(\d{1,2})\s*分\s*[）\)]")
MARKS_ONLY_RE = re.compile(r"^[（\(]?\s*\d{1,2}\s*分\s*[）\)]?$")
FIG_REF = re.compile(r"上圖|下圖|圖一|圖二|圖三|上表|下表|附圖|如圖|圖表|下圖顯示|上圖所示|下表顯示|下表列出")
NEW_CONTEXT_RE = re.compile(r"細閱|下表|上表|下圖|上圖|附圖|以下是一|下列圖表|下圖顯示")
Q_WORD_RE = re.compile(r"(?<!測)(?<!考)試|指出|描述|解釋|討論|說明|計算|舉|列|建議|比較|哪|何|什麼|是否同意|寫出|完成|修改|設計|評")
KIND_TIME = [("討論", "discuss", 210), ("指出", "point", 120),
             ("描述", "describe", 180), ("解釋", "describe", 180),
             ("說明", "describe", 180)]
PAPER_ZH = {1: "卷一", 2: "卷二"}
SCHOOL_NOISE = re.compile(r"余振強|溫習題|體育選修科|第[一二三四五六七八九]部?份")


def classify(text: str) -> tuple[str, int]:
    sec, kind = 0, "describe"
    for kw, k, s in KIND_TIME:
        if kw in text and s > sec:
            sec, kind = s, k
    if sec == 0:
        sec = 180
    return kind, sec


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def parse_file(unit: int, path: Path) -> list[dict]:
    items: list[dict] = []
    year = paper = 0
    practice = False
    context: list[str] = []
    cur: dict | None = None
    state = "seek"  # seek | answers | context

    def flush() -> None:
        nonlocal cur
        if not cur:
            return
        text = cur["text"]
        answers = [a for a in cur["answers"] if a]
        ctx = cur.get("ctx", "")
        cur_marks = cur.get("marks")
        cur = None
        if not answers:
            return
        full = f"{ctx} {text}"
        if FIG_REF.search(full):
            return
        if any(FIG_REF.search(a) for a in answers):
            return
        answers = [a for a in answers if not HEADERISH_RE.search(a) and not SCENARIO_RE.search(a)]
        answer = "\n".join(answers).strip()
        if len(answer) < 2 or len(answers) > 10:
            return
        if not Q_WORD_RE.search(text):
            return
        if len(text) > 240 or GLUE_RE.search(text):
            return
        if "評分準則" in text or "===" in text or "===" in answer:
            return
        if TRUNC_TEXT_RE.search(text) or TRUNC_ANS_RE.search(answer):
            return
        if COLON_END_RE.search(text):
            return
        if any(Q_IN_ANS_RE.search(a) for a in answers):
            return
        if any(MARKS_RE.search(a) for a in answers):
            return
        if COLON_END_RE.search(answer) or all(COLON_END_RE.search(a) for a in answers):
            return
        if TRAIL_BAD_RE.search(answers[-1]):
            return
        kind, seconds = classify(text)
        marks_m = MARKS_RE.search(text)
        marks = int(marks_m.group(1)) if marks_m else cur_marks
        qtext = MARKS_RE.sub("", text).strip(" 　")
        if len(qtext) < 8:
            return
        items.append({
            "unit": unit,
            "year": year,
            "practice": practice,
            "paper": paper,
            "context": ctx,
            "text": qtext,
            "marks": marks,
            "answer": answer,
            "kind": kind,
            "seconds": seconds,
        })

    skip_rows = 0
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.startswith("#"):
            continue
        m = LINE_RE.match(raw)
        line = clean(m.group(1) if m else raw)
        tm = re.match(r"^=== TABLE \d+ rows=(\d+)", line)
        if tm:
            skip_rows = int(tm.group(1))
            continue
        if skip_rows > 0 and line:
            skip_rows -= 1
            continue
        ym = YEAR_RE.match(line)
        if ym:
            flush()
            context = []
            state = "seek"
            year = int(ym.group(1) or ym.group(2))
            practice = bool(ym.group(3))
            paper = int(ym.group(4))
            continue
        if not line or year == 0:
            continue
        if SCHOOL_NOISE.search(line) and not MARKS_RE.search(line):
            continue
        has_marks = MARKS_RE.search(line)
        is_part_q = (
            PART_Q_RE.match(line)
            and Q_WORD_RE.search(line)
            and len(line) > 12
            and not HEADERISH_RE.search(line)
        )
        if (has_marks and Q_WORD_RE.search(line)) or (is_part_q and cur is not None and state == "answers"):
            flush()
            context_for_q = context
            context = []
            cur = {"text": line, "answers": [], "marks": int(has_marks.group(1)) if has_marks else None}
            state = "answers"
            cur["ctx"] = " ".join(context_for_q).strip()
            continue
        if MARKS_ONLY_RE.match(line):
            if cur and not MARKS_RE.search(cur["text"]):
                cur["marks"] = int(re.sub(r"\D", "", line))
            continue
        # plain text line
        if cur is None or state != "answers":
            context.append(line)
            state = "context"
            continue
        # collecting answers
        if HEADERISH_RE.search(line):
            continue
        if NEW_CONTEXT_RE.search(line):
            flush()
            context = [line]
            state = "context"
        else:
            cur["answers"].append(line)
    flush()
    return items


def main() -> None:
    bank: list[dict] = []
    for unit, name in FILES.items():
        path = EXTRACT / name
        if not path.exists():
            print("missing", name)
            continue
        items = parse_file(unit, path)
        seq = 0
        for it in items:
            seq += 1
            p = "p" if it.pop("practice") else ""
            ctx = it.pop("context")
            text = it["text"]
            if ctx and ctx not in text:
                text = f"{ctx} {text}"
            kind_seconds = (it["kind"], it["seconds"])
            bank.append({
                "id": f"h{it['year']}{p}-{unit}-q{seq:02d}",
                "year": it["year"],
                "unit": unit,
                "paper": str(it["paper"]),
                "source": f"{it['year']}{' 練習卷' if p else ''} · {PAPER_ZH.get(it['paper'], '卷一')}",
                "text": text,
                "marks": it["marks"],
                "answer": it["answer"],
                "kind": kind_seconds[0],
                "seconds": kind_seconds[1],
            })
        print(f"unit {unit}: {len(items)} questions with answers")
    seen: set[str] = set()
    deduped: list[dict] = []
    for it in bank:
        key = re.sub(r"\s+", "", it["text"])[:40]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)
    if len(deduped) != len(bank):
        print("deduped:", len(bank) - len(deduped))
    bank = deduped
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")
    print("total:", len(bank))
    print("by year:", dict(sorted(Counter(i["year"] for i in bank).items())))
    print("by unit:", dict(sorted(Counter(i["unit"] for i in bank).items())))
    print("by kind:", Counter(i["kind"] for i in bank))


if __name__ == "__main__":
    main()
