# -*- coding: utf-8 -*-
import io
import json
import random
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
bank = json.loads(Path(r"C:\Users\MKPC\Desktop\studnet attendance\tmp\pe-qbank\extract\parsed_historical_sq.json").read_text(encoding="utf-8"))
random.seed(42)
sample = random.sample(bank, 15)
for q in sample:
    print("=" * 70)
    print(f"{q['id']} | {q['source']} | unit {q['unit']} | {q['kind']} {q['seconds']}s | marks {q['marks']}")
    print("Q:", q["text"][:150])
    print("A:", q["answer"][:220])
