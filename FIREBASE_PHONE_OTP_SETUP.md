# SheCare Firebase Phone OTP Setup

This version replaces Twilio Verify with Firebase Phone Authentication.

## Firebase Console
1. Open the Shecare Firebase project.
2. Go to Authentication → Sign-in method.
3. Make sure **Phone** is enabled.
4. For local testing, use `http://localhost:3000`.
5. Keep the existing web app registered in the project.

## Project files
- `js/runtime-config.js` contains the Firebase web configuration.
- `src/services/firebase-auth.js` validates Firebase ID tokens on the backend.
- `login.html` sends and confirms phone OTPs with Firebase.
- `src/controllers/auth.controller.js` marks the pending signup phone as verified only after the backend validates the Firebase token.
- Email OTP remains handled by the existing SMTP service.

## Environment
Set:
`FIREBASE_API_KEY=your-firebase-web-api-key`

No Twilio credentials are required.

## Run
From `shecare_final_fix`:

```text
npm install
npx prisma db push
npm start
```

Open:
`http://localhost:3000/login.html`

## Important
Firebase's free/Spark phone authentication is subject to the quota and anti-abuse limits shown in the Firebase Console. It is not unlimited free SMS.

The Firebase web API key is client configuration and is intentionally present in `js/runtime-config.js`. Never put Firebase service-account private keys or other server secrets in frontend files.
