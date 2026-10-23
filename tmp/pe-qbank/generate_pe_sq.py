# -*- coding: utf-8 -*-
"""Generate short-answer (SQ) bank for the web trainer from 2021-2025 JSON.

- Flattens 卷一乙部 short questions and 卷二 long-question parts into single items.
- Classifies command word to set per-question time limit:
    討論 → 210s；指出 → 120s；描述／解釋／說明（及其他）→ 180s（取最長適用）
- Skips parts without answers, and parts referencing figures/tables we do not have.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\MKPC\Desktop\studnet attendance")
JSON_DIR = ROOT / "tmp" / "pe-qbank" / "new_questions"
FIG_DIR = ROOT / "public" / "pe" / "figures"
OUT = ROOT / "src" / "data" / "pe-sq-papers.json"
YEARS = [2021, 2022, 2023, 2024, 2025]

PAPER_ZH = {"1A": "卷一甲部", "1B": "卷一乙部", "2": "卷二"}
KIND_TIME = [("討論", "discuss", 210), ("指出", "point", 120),
             ("描述", "describe", 180), ("解釋", "describe", 180),
             ("說明", "describe", 180)]
FIG_REF = re.compile(r"上圖|下圖|圖一|圖二|圖三|上表|下表|附圖|如圖")


def classify(text: str) -> tuple[str, int]:
    sec, kind = 0, "describe"
    for kw, k, s in KIND_TIME:
        if kw in text and s > sec:
            sec, kind = s, k
    if sec == 0:
        sec = 180
    return kind, sec


def slug(part: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(part).lower())


def main() -> None:
    items: list[dict] = []
    skipped_no_ans = skipped_fig = skipped_unit = 0
    for year in YEARS:
        data = json.loads((JSON_DIR / f"{year}.json").read_text(encoding="utf-8"))
        groups = [("short", "s"), ("long", "l")]
        for section, tag in groups:
            for q in data.get(section) or []:
                paper = str(q.get("paper") or ("1B" if section == "short" else "2"))
                theme = str(q.get("theme") or "").strip()
                image = str(q.get("image") or "").strip()
                has_fig = bool(image) and (FIG_DIR / image).exists()
                for part in q.get("parts") or []:
                    text = str(part.get("text") or "").strip()
                    answer = str(part.get("answer") or "").strip()
                    if not text:
                        continue
                    if not answer:
                        skipped_no_ans += 1
                        continue
                    unit = int(part.get("unit") or q.get("unit_primary") or 0)
                    if not 1 <= unit <= 9:
                        skipped_unit += 1
                        continue
                    if FIG_REF.search(text) and not has_fig:
                        skipped_fig += 1
                        continue
                    kind, seconds = classify(text)
                    marks = part.get("marks")
                    label = str(part.get("part") or "").strip()
                    item = {
                        "id": f"{year}-{tag}{q.get('q')}{slug(label)}",
                        "year": year,
                        "unit": unit,
                        "paper": paper,
                        "source": f"HKDSE {year} · {PAPER_ZH.get(paper, '試卷' + paper)} 第{q.get('q')}題"
                                  + (f"（{label}）" if label else ""),
                        "text": text,
                        "marks": marks if isinstance(marks, int) else None,
                        "answer": answer,
                        "kind": kind,
                        "seconds": seconds,
                    }
                    if theme:
                        item["theme"] = theme
                    if has_fig and FIG_REF.search(text):
                        item["figure"] = {
                            "kind": "image",
                            "src": f"/pe/figures/{image}",
                            "alt": f"HKDSE {year} 第{q.get('q')}題附圖",
                        }
                    items.append(item)
    # merge historical 2008-2020 questions parsed from old combined 分冊 extracts
    hist_path = ROOT / "tmp" / "pe-qbank" / "extract" / "parsed_historical_sq.json"
    hist = json.loads(hist_path.read_text(encoding="utf-8"))
    existing_texts = {re.sub(r"\s+", "", i["text"])[:40] for i in items}
    added_hist = 0
    for h in hist:
        key = re.sub(r"\s+", "", h["text"])[:40]
        if key in existing_texts:
            continue
        items.append(h)
        existing_texts.add(key)
        added_hist += 1
    items.sort(key=lambda i: (i["unit"], i["year"], i["id"]))
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    print("total:", len(items), f"(+{added_hist} historical)")
    print("by year:", dict(sorted(Counter(i["year"] for i in items).items())))
    print("by unit:", dict(sorted(Counter(i["unit"] for i in items).items())))
    print("by kind:", Counter(i["kind"] for i in items))
    print("skipped no_answer:", skipped_no_ans, "| fig:", skipped_fig, "| unit:", skipped_unit)


if __name__ == "__main__":
    main()
