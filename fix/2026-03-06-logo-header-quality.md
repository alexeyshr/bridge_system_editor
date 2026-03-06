## Fix: Header logo quality on zoom

- Date: 2026-03-06
- Symptom: logo looked rough/aliased when browser zoom increased.

### Root Cause
The header logo rendering path used transformed output that amplified artifacts under zoom.

### Change
1. Kept a clean cropped source image (`/logo_header.png`) for the header.
2. Updated header image config in `components/TopBar.tsx`:
   - larger intrinsic size (`300x65`)
   - `quality={100}`
   - `unoptimized` to avoid extra transform artifacts
   - slightly larger display height (`h-10`) to fit the top bar better

### Result
Logo renders cleaner and scales better at zoom levels used in the app.
