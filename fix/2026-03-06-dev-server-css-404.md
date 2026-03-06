## Fix: styles missing in local dev (CSS 404)

- Date: 2026-03-06
- Environment: local dev server (`npm run dev`)
- Symptom: page rendered unstyled, utility classes not applied.

### Root Cause
Dev server returned `404` for `/_next/static/css/app/layout.css`, while HTML/JS were served.

### Change
Restarted the running dev server process.

### Verification
- Home page: `http://localhost:3000`
- CSS endpoint now returns `200` for `/_next/static/css/app/layout.css?...`

