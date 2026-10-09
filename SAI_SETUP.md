# AI assistant setup

SheCare has one AI assistant named **AI**, positioned above **SOS**. The browser sends chat messages to `/api/chat`; only the backend talks to the OpenAI API. No API key is placed in HTML, CSS, JavaScript, localStorage, or GitHub.

## Setup
1. Install Node.js 18+.
2. Configure PostgreSQL and set `DATABASE_URL` in `.env`.
3. Copy `.env.example` to `.env`.
4. Set a strong `JWT_SECRET` (at least 32 characters).
5. Set `OPENAI_API_KEY` and an API model supported by your OpenAI account in `OPENAI_MODEL`.
6. Run `npm install` and `npx prisma generate`.
7. Run `npx prisma migrate dev --name init`.
8. Run `npm start`.
9. Open `http://localhost:3000`.

For production, use HTTPS, set `COOKIE_SECURE=true`, configure `FRONTEND_URL` to the deployed frontend origin, and keep secrets only in the backend hosting provider's environment variables.
