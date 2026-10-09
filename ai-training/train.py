import os
import sys
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_BASE_MODEL", "").strip()

if not API_KEY:
    print("ERROR: OPENAI_API_KEY is missing in .env")
    sys.exit(1)

if not MODEL:
    print("ERROR: OPENAI_BASE_MODEL is missing in .env")
    print("Set it to a fine-tuning-compatible model available to your account.")
    sys.exit(1)

dataset = Path(__file__).parent / "shecares_ai_training_dataset.jsonl"
if not dataset.exists():
    print(f"ERROR: Dataset not found: {dataset}")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

print("1/2 Uploading SHECARES training dataset...")
with dataset.open("rb") as f:
    uploaded = client.files.create(
        file=f,
        purpose="fine-tune"
    )

print("Training file ID:", uploaded.id)

print("2/2 Creating fine-tuning job...")
job = client.fine_tuning.jobs.create(
    training_file=uploaded.id,
    model=MODEL
)

print("\nFine-tuning job created successfully.")
print("Job ID:", job.id)
print("Base model:", MODEL)
print("Status:", job.status)
print("\nCheck status later with:")
print("python check_status.py", job.id)
