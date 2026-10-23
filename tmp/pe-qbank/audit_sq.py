# -*- coding: utf-8 -*-
"""Final audit of historical SQ bank: flag suspicious items."""
import io
import json
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
bank = json.loads(Path(r"C:\Users\MKPC\Desktop\studnet attendance\tmp\pe-qbank\extract\parsed_historical_sq.json").read_text(encoding="utf-8"))

patterns = {
    "answer_has_試": re.compile(r"試(從|以|指出|描述|說明|解釋|討論|加以|建議)"),
    "answer_has_DSE": re.compile(r"DSE|PAPER|HKCEE", re.I),
    "answer_scenario": re.compile(r"是一位|是一名"),
    "answer_ends_colon": re.compile(r"[:：︰∶]\s*$"),
    "answer_has_marks": re.compile(r"[（(]\s*\d{1,2}\s*分\s*[）)]"),
    "text_ends_colon": re.compile(r"[:：︰∶]\s*$"),
    "answer_has_TABLE": re.compile(r"===|評分準則"),
}
for name, pat in patterns.items():
    hits = [q["id"] for q in bank if pat.search(q["answer"]) or (name == "text_ends_colon" and pat.search(q["text"]))]
    print(f"{name}: {len(hits)}", hits[:8])

# answers that are very short or look like labels
short = [q["id"] for q in bank if len(q["answer"]) < 3]
print("answer_too_short:", len(short), short)
# duplicated texts
from collections import Counter
c = Counter(q["text"][:30] for q in bank)
dups = {k: v for k, v in c.items() if v > 1}
print("dup_texts:", len(dups), list(dups)[:5])
