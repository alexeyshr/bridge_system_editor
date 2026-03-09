# 2026-03-10: Sign-in failure due to NextAuth route collision

## Symptom
- UI sign-in always returned generic `Sign in failed. Check email/password.`
- Browser never called `POST /api/auth/callback/credentials`.

## Root cause
- Custom route `app/api/auth/providers/route.ts` shadowed NextAuth endpoint `/api/auth/providers`.
- `next-auth/react` received wrong providers payload shape and could not run credentials callback flow.

## Fix
- Removed `app/api/auth/providers/route.ts`.
- Keep NextAuth-owned `/api/auth/*` namespace untouched.
- If custom provider metadata is needed, expose it under a different path (e.g. `/api/auth-meta/providers`).
