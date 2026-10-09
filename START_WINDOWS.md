# SheCare — Windows quick start

Open this folder in VS Code. The folder containing `package.json` is the project root.

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL` and `JWT_SECRET` (at least 32 characters).
3. Optionally configure `OPENAI_API_KEY` and SMTP variables.
4. In the VS Code terminal, run:

```powershell
npm install
npx prisma migrate dev --name init
# optional initial seed data
npm run prisma:seed
npm start
```

Then open `http://localhost:3000`.

Do not use the VS Code “Start JSON Server” button; SheCare uses the Node/Express server started by `npm start`.

# Firebase Phone Authentication
FIREBASE_API_KEY=your-firebase-web-api-key
