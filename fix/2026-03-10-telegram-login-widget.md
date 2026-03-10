# 2026-03-10: Telegram login widget wiring

## Problem

Sign-in screen had only Telegram backend placeholder text, but no Telegram Login Widget in UI.
Users could not start Telegram auth flow from browser.

## Fix

- Implemented Telegram Login Widget on `app/auth/signin/page.tsx`.
- Added client callback `BridgeTelegramAuth(user)` to call `signIn('telegram', payload)`.
- Added env requirement:
  - `NEXT_PUBLIC_TELEGRAM_BOT_NAME` (without `@`) in `.env.example`.
- Updated runtime docs in `readme.md`.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
