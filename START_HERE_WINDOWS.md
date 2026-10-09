# SHECARES — START HERE (Windows)

IMPORTANT: Open THIS folder in VS Code. It contains `package.json` and `server.js`.
Do NOT run npm commands from a parent folder.

Expected terminal path:
C:\Users\<your-name>\Downloads\SHECARES_FULLSTACK_FIXED>

1. Verify the project root
   PowerShell:
   dir package.json

   If `package.json` is shown, you are in the correct folder.

2. Install dependencies
   npm install

3. Configure environment
   Copy `.env.example` to `.env` and fill in:
   DATABASE_URL
   JWT_SECRET
   OPENAI_API_KEY
   OPENAI_MODEL
   SMTP_HOST
   SMTP_PORT
   SMTP_USER
   SMTP_PASSWORD
   SMTP_FROM
   FRONTEND_URL
   PORT=3000

4. Generate Prisma client
   npx prisma generate

5. Create/update the PostgreSQL database
   npx prisma migrate dev --name init

6. Optional initial seed data
   npm run prisma:seed

7. Start SheCare
   npm start

8. Open in your browser
   http://localhost:3000

DO NOT use VS Code's "Start JSON Server" button. SheCare uses Node.js/Express.

If `dir package.json` says it cannot find the file, you are in the wrong folder.
In VS Code Explorer, locate the folder containing `package.json`, right-click it,
choose "Open in Integrated Terminal", and run the commands there.

Never put OPENAI_API_KEY, DATABASE_URL, JWT_SECRET, SMTP passwords, or other secrets
in frontend JavaScript or GitHub.

# Firebase Phone Authentication
FIREBASE_API_KEY=your-firebase-web-api-key
