# SHECARES AI Training Project

This project uses the supplied `shecares_ai_training_dataset.jsonl` as a starter
fine-tuning dataset and provides scripts to validate it, create a fine-tuning
job, check its status, and test the resulting model.

## Files

- `shecares_ai_training_dataset.jsonl` - 57 curated synthetic examples.
- `validate_dataset.py` - checks JSONL structure before training.
- `train.py` - uploads the dataset and creates a fine-tuning job.
- `check_status.py` - checks a fine-tuning job.
- `chat.py` - simple command-line test chat using the trained model.
- `.env.example` - environment-variable template.
- `requirements.txt` - Python dependencies.

## Windows setup

Open PowerShell in this folder.

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Open `.env` and add your OpenAI API key and a fine-tuning-compatible base model
available to your account.

## Validate the dataset

```powershell
python validate_dataset.py
```

Expected result:

```text
Dataset OK: 57 examples validated.
```

## Start training

```powershell
python train.py
```

The script uploads the JSONL file and creates the fine-tuning job. It prints the
training file ID and job ID.

## Check training status

```powershell
python check_status.py YOUR_JOB_ID
```

When the job finishes, copy the returned fine-tuned model ID into:

```text
SHECARES_MODEL=ft:...
```

Then test:

```powershell
python chat.py
```

## Important for the existing SHECARES Node backend

Your current SHECARES backend uses the OpenAI API from the server. Do NOT put
`OPENAI_API_KEY` in HTML, browser JavaScript, Netlify frontend variables, or
the training dataset.

Once a fine-tuned model is available, your backend can use the returned model
ID through its server-side `OPENAI_MODEL`/model configuration, subject to the
model/API supported by your OpenAI account.

## Healthcare safety

This is a starter educational dataset, not a clinical guideline or diagnostic
database. It contains synthetic examples and no real patient information.

Before using the assistant for real users:
- have medical content reviewed by qualified healthcare professionals;
- keep current authoritative medical sources available through retrieval;
- do not use the model as a diagnostic or prescribing system;
- escalate emergencies to appropriate local emergency services;
- do not store or train on unnecessary personally identifying patient data;
- evaluate the model for unsafe, incorrect, biased, or overconfident answers.

Also remember that fine-tuning changes model behavior; it does not guarantee
medical accuracy or make the model a medical device.
