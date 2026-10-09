import os
import sys
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

if len(sys.argv) != 2:
    print("Usage: python check_status.py <FINE_TUNING_JOB_ID>")
    sys.exit(1)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("ERROR: OPENAI_API_KEY is missing in .env")
    sys.exit(1)

client = OpenAI(api_key=api_key)
job_id = sys.argv[1]

job = client.fine_tuning.jobs.retrieve(job_id)

print("Job ID:", job.id)
print("Status:", job.status)
print("Base model:", job.model)
print("Fine-tuned model:", getattr(job, "fine_tuned_model", None))

if getattr(job, "error", None):
    print("Error:", job.error)
