## Postmortem: UI looked loaded but was non-interactive

- Date: 2026-03-06
- Incident: side panels, tree collapse, row actions and right inspector stopped working.

### What happened
The page HTML loaded, but key client scripts returned `404` (`main-app.js`, `app-pages-internals.js`, `polyfills.js`). React hydration did not run, so all client interactions were dead.

### Why this mistake happened
I focused on component-level regressions first and did not immediately verify network status for Next.js runtime chunks. That delayed identifying the real cause (broken runtime delivery instead of UI logic).

### Prevention
1. For any "all UI interactions dead" report, first check `/` plus `_next/static/chunks/*` responses.
2. If chunk 404 appears in dev, immediately clear `.next` and restart `npm run dev`.
3. Only after chunk delivery is healthy, continue debugging component/state logic.
