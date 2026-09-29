# Authentication and LiveKit setup

## Investigation

- Landing and dashboard route guards already use the auth context. Logout previously reported success even on failure, did not cancel pending queries, and cleared cookies without matching production SameSite/Secure attributes. These paths are corrected; browser reproduction against the deployment is still needed.
- Login had partial email validation and an unreachable mock CAPTCHA challenge. Login now normalizes and validates email and requires Google reCAPTCHA on both client and server.
- Forgot password only accepted three hard-coded demo emails, a fixed CAPTCHA and a mock token/code. No student reset API existed. It now looks up the same User/PasswordCredential records as signup/login, emails a random link, stores only its hash, expires it after 15 minutes and consumes it atomically. Reset revokes refresh sessions and rejects older access tokens using passwordChangedAt.
- The existing LiveKit token endpoint requires external credentials; all three LiveKit variables are absent from the checked local environment files. The endpoint now also validates the WebSocket URL and returns 503 for missing configuration.

## Required deployment settings

Create a Google reCAPTCHA **v2 checkbox** site for the actual frontend domains (include localhost for local testing). Set:

```dotenv
# React build environment; rebuild the frontend after changing this.
REACT_APP_RECAPTCHA_SITE_KEY=<public site key>
# Server environment only
RECAPTCHA_SECRET_KEY=<secret key>
RECAPTCHA_ALLOWED_HOSTNAMES=your-frontend.example,localhost
FE_URL=https://your-frontend.example
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<mailbox>
SMTP_PASS=<mailbox/app password>
SMTP_FROM=<sender address>
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<project key>
LIVEKIT_API_SECRET=<project secret>
```

Existing Zoho/EMAIL aliases in EmailTransporter are also supported. Never put secrets in React variables. Missing CAPTCHA configuration intentionally blocks password login/reset. Social sign-in continues using its provider. Provider-only accounts should recover through Google/Microsoft.

Use the URL/key/secret from the same LiveKit project. Restart the Node server after configuring it. Do not use LiveKit development credentials in production. No infrastructure or credentials were provisioned by this change.

The auth rate limiter is per process (20 requests per IP per endpoint per 15 minutes). Configure trusted proxy handling and a shared gateway limit for multi-instance deployment. Do not trust arbitrary forwarded IP headers.

## Validation

Run `node --test tests/auth-recaptcha.test.js tests/student-password-reset.test.js` from server. These use mocked Google, database and email boundaries; they do not prove external delivery or connectivity.

After deployment: sign in, log out, visit `/` and directly visit `/dashboard`; test invalid email, expired CAPTCHA, registered and unknown reset emails, expired/used links, and login with the new password. Join a live room from two browsers and verify audio/video. Configure frontend hosting to serve the SPA for `/reset-password` links.

References: [Google token verification](https://developers.google.com/recaptcha/docs/verify), [LiveKit project connection settings](https://docs.livekit.io/reference/developer-tools/livekit-cli/).
