## Postmortem: why UI looked broken (unstyled page)

- Date: 2026-03-06
- Project: `C:\Users\shram\Desktop\BRIDGE\bridge-bidding-ide`
- Symptom: app opened, but all Tailwind styles were missing.

### What actually failed
Dev server on `localhost:3000` returned `404` for:

- `/_next/static/css/app/layout.css?...`

When this CSS file is not served, the app renders as plain HTML.

### Why I made this mistake
I validated only `lint` and `build`, but did not run a runtime smoke-check for dev static assets (`layout.css`) after each change/restart.

So I falsely treated “build is green” as “local dev UI is healthy”.

### Concrete fix applied
1. Restarted the dev server process.
2. Re-checked CSS endpoint directly.
3. Confirmed `CSS_STATUS=200` and non-zero CSS content length.

### Rule to avoid repeating this
After any UI task and after any dev-server restart, run this health check:

1. Open `http://localhost:3000`
2. Verify CSS endpoint from page HTML (`/_next/static/css/app/layout.css?...`) returns `200`
3. Only then report “done”

### Personal prevention checklist
- Do not rely on `npm run build` as a substitute for dev-runtime verification.
- For this project, always include a CSS endpoint check in final validation.
- If user reports “everything is broken”, first test static asset responses (`css/js`) before touching component code.

