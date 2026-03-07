# Quickstart: Persistent Multi-User Workspace

## 1) Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (local or remote)

## 2) Configure environment

Create `.env.local` (or copy from `.env.example`) with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bridge_editor?schema=public"
AUTH_SECRET="replace-with-random-secret"
AUTH_TRUST_HOST="true"
TELEGRAM_BOT_TOKEN="replace-with-telegram-bot-token"
TELEGRAM_BOT_NAME="your_bot_name"
# Optional (for email invites):
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_USER="user"
# SMTP_PASS="pass"
```

## 3) Install dependencies

```bash
npm ci
```

## 4) Run migrations

```bash
npx prisma migrate dev
```

## 5) Start app

```bash
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

## 6) Smoke test checklist

1. Register/sign in.
2. Create new bidding system.
3. Edit node fields and wait for `Saved` status.
4. Refresh page; verify changes persist.
5. Open second browser profile; verify access controls.
