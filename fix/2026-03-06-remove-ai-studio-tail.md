## Fix: removed AI Studio template tail completely

- Date: 2026-03-06

### Removed

1. Package identity tail:
   - renamed package from `ai-studio-applet` to `bridge-system-editor`
2. Unused AI dependencies:
   - removed `@google/genai`
   - removed `firebase-tools`
3. Environment template tail:
   - replaced AI Studio-specific `.env.example` content with neutral project template
4. Config comment tail:
   - removed `AI Studio` wording from `next.config.ts` comments

### Lockfile sync

- `package-lock.json` regenerated to match new package name and dependency set.

### Validation

- repository search shows no remaining references to:
  - `ai-studio`
  - `AI Studio`
  - `@google/genai`
  - `GEMINI_API_KEY`
  - `firebase-tools`
