# PR Draft: Telegram Login Widget

## Title

`feat(auth): wire Telegram Login Widget on sign-in page`

## Body

## Spec Link

- `specs/009-collaboration-discussions-and-sharing/spec.md`
- `specs/009-collaboration-discussions-and-sharing/pr-telegram-login-widget.md`

## Scope

- Add Telegram Login Widget to `app/auth/signin/page.tsx`.
- Wire widget callback to `signIn('telegram', payload)`.
- Add public env var in `.env.example`:
  - `NEXT_PUBLIC_TELEGRAM_BOT_NAME`.
- Update runtime docs in `readme.md`.
- Add fix note:
  - `fix/2026-03-10-telegram-login-widget.md`.

## Out of scope

- Telegram Mini App auth.
- Bot webhook logic.
- Social login providers other than Telegram.

## Acceptance criteria

- Sign-in page shows Telegram widget when `NEXT_PUBLIC_TELEGRAM_BOT_NAME` is configured.
- Widget callback sends full payload to NextAuth `telegram` provider.
- Successful Telegram auth signs user in and redirects to `/`.
- If widget/env is missing, page shows explicit configuration hint.

## Test evidence

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
