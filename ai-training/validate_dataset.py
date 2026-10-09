import json
from pathlib import Path

path = Path(__file__).parent / "shecares_ai_training_dataset.jsonl"
count = 0

required_roles = {"system", "user", "assistant"}

with path.open("r", encoding="utf-8") as f:
    for line_no, line in enumerate(f, 1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            raise SystemExit(f"Invalid JSON on line {line_no}: {e}")

        messages = obj.get("messages")
        if not isinstance(messages, list):
            raise SystemExit(f"Line {line_no}: missing messages array")

        roles = {m.get("role") for m in messages}
        if not required_roles.issubset(roles):
            raise SystemExit(f"Line {line_no}: expected system, user and assistant messages")

        for m in messages:
            if not isinstance(m.get("content"), str) or not m["content"].strip():
                raise SystemExit(f"Line {line_no}: message content is empty")

        count += 1

print(f"Dataset OK: {count} examples validated.")
