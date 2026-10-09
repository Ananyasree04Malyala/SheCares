import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("SHECARES_MODEL", "").strip()

if not api_key:
    raise SystemExit("OPENAI_API_KEY is missing in .env")
if not model:
    raise SystemExit("SHECARES_MODEL is missing in .env")

client = OpenAI(api_key=api_key)

SYSTEM = """You are SHECARES AI, a women's-health educational assistant.
Provide general educational information only.
Do not diagnose diseases or prescribe medication.
Do not claim certainty when information is incomplete.
For severe, sudden, or potentially life-threatening symptoms, advise urgent professional/emergency care.
Never pretend that an AI chat can physically intervene in an emergency."""

print("SHECARES AI test chat. Type 'exit' to stop.\n")

history = [{"role": "system", "content": SYSTEM}]

while True:
    user = input("You: ").strip()
    if user.lower() in {"exit", "quit"}:
        break
    if not user:
        continue

    history.append({"role": "user", "content": user})

    response = client.responses.create(
        model=model,
        input=history
    )

    answer = response.output_text
    print("SHECARES AI:", answer, "\n")
    history.append({"role": "assistant", "content": answer})
