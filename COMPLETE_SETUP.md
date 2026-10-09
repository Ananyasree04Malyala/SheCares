# SHECARES Complete App

This package combines the SHECARES frontend, Node/Express backend, Prisma/PostgreSQL schema, and AI training project.

## Run the application

1. Install Node.js (LTS) and PostgreSQL.
2. Open this folder in VS Code.
3. Create/fill `.env` using the existing `.env` template. Keep secrets private.
4. Install dependencies:

```powershell
npm install
```

5. Generate/apply the database schema:

```powershell
npx prisma migrate dev
```

6. Start the server:

```powershell
npm start
```

7. Open:

`http://localhost:3000`

## AI training

See `ai-training/README.md`.

Validate:

```powershell
cd ai-training
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python validate_dataset.py
```

The OpenAI API key must remain server-side. Do not commit `.env`, API keys, database passwords, or other secrets.

## Important

The training data is a starter educational dataset, not a clinical guideline. Have medical content reviewed before real-world healthcare use. The app's AI should not diagnose or prescribe, and emergencies should be escalated to appropriate local emergency services.


## Firebase Phone OTP
Enable **Authentication → Sign-in method → Phone** in the Firebase project. The browser sends the SMS OTP with Firebase Phone Authentication; the backend verifies the resulting Firebase ID token. No Twilio configuration is needed. Keep the Firebase web config in `js/runtime-config.js`; it is client configuration, not a service-account secret.

## Activity History
SheCare now stores a user-scoped activity history in the database. Successful logins/signups, profile changes, health-record creates/updates/deletes, pregnancy saves, AI conversations, and SOS events are timestamped and shown on `history.html`. Each authenticated user can only retrieve their own history.
After replacing the project, run `npx prisma db push` (or create/apply a normal Prisma migration) so the `ActivityHistory` table is created.
