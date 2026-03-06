## Fix: UI non-interactive due missing Next.js chunks

- Date: 2026-03-06
- Symptom: panels, tree toggles, row hover actions and right panel stopped responding.

### Root Cause
The page HTML was served, but critical client chunks returned `404`:
- `/_next/static/chunks/main-app.js`
- `/_next/static/chunks/app-pages-internals.js`
- `/_next/static/chunks/polyfills.js`

Without these scripts, hydration did not happen and UI stayed static.

### Change
1. Stopped the dev server process on port `3000`.
2. Removed `.next` cache directory.
3. Started `npm run dev` again.
4. Verified all script chunk URLs from the homepage return `200`.

### Result
Client hydration restored; interactive UI behavior is available again.
