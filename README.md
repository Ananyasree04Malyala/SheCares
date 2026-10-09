# SheCare — Full-Stack Integration

This package keeps the existing SheCare HTML/CSS/JavaScript frontend and adds a Node.js + Express + PostgreSQL + Prisma backend. Important user/application data is persisted server-side; the OpenAI key and database credentials stay on the backend.

## Requirements
- Node.js 18+
- PostgreSQL 14+
- An OpenAI API key for the AI assistant
- SMTP credentials for real password-reset email delivery

## 1. Install
```bash
npm install
npx prisma generate
```

## 2. Environment
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- SMTP variables for email
- `FRONTEND_URL`

Never commit `.env`.

## 3. Database
```bash
npx prisma migrate dev --name init
npm run prisma:seed
```
The seed creates an initial administrative account:
`admin@shecare.health` / `SheCare@2026!`

## 4. Run
```bash
npm start
```
Open `http://localhost:3000`.

## API
Authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password`

Private resources include:
- `/api/profile`
- `/api/emergency-contacts`
- `/api/sos`
- `/api/chat`
- `/api/periods`
- `/api/pregnancy`
- `/api/blood-pressure`
- `/api/glucose`
- `/api/appointments`
- `/api/reminders`
- `/api/medicines`
- `/api/mood`
- `/api/water`
- `/api/fitness`

Health check: `GET /api/health`.

## Frontend integration
The existing pages use `js/api.js` for authenticated API requests. The existing UI remains in place. LocalStorage is retained only for harmless UI preferences/fallback calculators; primary account and health records are sent to the backend.

## Password reset
The backend creates a cryptographically random token, stores only its SHA-256 hash, expires it after 30 minutes, and invalidates it after use. SMTP must be configured for actual delivery.

## AI
The browser calls `/api/chat`. The backend calls OpenAI. `OPENAI_API_KEY` is never exposed to the browser or stored in localStorage.

## SOS
The existing SOS UI requests browser geolocation, posts the coordinates to `/api/sos`, stores the event, and reports notification delivery truthfully. India emergency number 112 remains available in the UI. SheCare uses email notification infrastructure when SMTP is configured; SMS uses Firebase Phone Auth or configured SMS provider.

## Netlify + backend deployment
Deploy the existing frontend to Netlify only if the frontend is configured to call your backend URL. Set `window.SHECARE_API_BASE` before `js/api.js`, or replace it at deploy time with your backend URL. Deploy the Node backend to a Node-compatible host such as Render/Railway/Fly.io and PostgreSQL to a managed PostgreSQL provider. Configure all environment variables on the backend. Set `FRONTEND_URL` to the exact Netlify origin and use HTTPS; set `COOKIE_SECURE=true` when frontend and backend are deployed over HTTPS. If frontend and backend are cross-site, the backend cookie is configured with `SameSite=None` when `COOKIE_SECURE=true`. In the Netlify copy, edit `js/runtime-config.js` so `window.SHECARE_API_BASE` is your backend HTTPS origin. This value is public and must not contain secrets.

## Security notes
Helmet, CORS, rate limits, input validation, HTTP-only cookies, bcrypt password hashing, authorization checks, request size limits, safe error messages, and secret-free logging are enabled. Every private query is scoped by the authenticated user's ID.

## Phone OTP (Firebase)

SheCare uses Firebase Phone Authentication for phone OTP during signup and mobile login. The Firebase web configuration is in `js/runtime-config.js` (client configuration is public). The backend uses `FIREBASE_API_KEY` to validate the Firebase ID token returned by the browser. No Twilio account or Twilio credentials are required.

On Firebase Spark/free usage, SMS verification is subject to Firebase's current quota and anti-abuse limits.
