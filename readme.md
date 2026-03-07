# Bridge System Editor

Интерактивный редактор системы торговли в бридже (Next.js + React + Zustand) с IDE-подобным интерфейсом:
- левая панель навигации (`Roots`, `Bookmarks`, `Saved Views`),
- центральное дерево заявок (classic/compact, раскрытие/сворачивание, hover-действия),
- правая карточка редактирования выбранной последовательности.

## Что умеет сейчас

- Просмотр дерева торговых последовательностей.
- Раскрытие/сворачивание веток (по узлу, `Expand All`, `Collapse All`).
- Поиск по последовательности, `notes`, `shows`.
- Быстрое добавление continuation через расширенную форму:
  - контракты `1C..7NT`,
  - `Pass`, `X`, `XX`,
  - блокировка недоступных заявок по правилам ранга.
- Удаление узла вместе со всеми продолжениями.
- Закладки (`Bookmarks`).
- Гибридное сохранение:
  - автосохранение черновика в `localStorage`,
  - явное сохранение файла через кнопку `Save` (YAML).
- Редактирование карточки узла:
  - `HCP`, `Type`, `Forcing`, `Alert`, `Accepted`,
  - shape-поля, patterns, notes,
  - комментарии и ответы.
- Import/Export системы в YAML.

## Технологии

- Next.js 15
- React 19
- TypeScript
- Zustand
- Tailwind CSS
- `react-resizable-panels`
- `js-yaml`

## Быстрый старт

Требования:
- Node.js 20+
- npm 10+

Установка и запуск:

```bash
npm ci
npm run dev
```

Открыть:
- `http://localhost:3000`

## Скрипты

```bash
npm run dev        # локальная разработка
npm run lint       # ESLint
npm run test       # smoke tests (node:test)
npm run typecheck  # TypeScript check (no emit)
npm run build      # production build
npm run start      # запуск production-сборки
npm run clean      # очистка .next и tsbuildinfo
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run db:healthcheck
npm run db:seed
npm run ui:baseline # automated UI baseline run (requires running dev server on :3000)
```

## Runtime Flags

- `API_TRANSPORT=rest|trpc` (default in `.env.example`: `trpc`)

Drizzle foundation files:

- `drizzle.config.ts`
- `lib/db/drizzle/schema.ts`
- `lib/db/drizzle/client.ts`
- `drizzle/*.sql` (generated migrations)
- `drizzle/rollback/*.down.sql` (manual rollback scripts)

## Формат данных (текущий)

Сейчас экспортируется YAML-массив узлов (UI-поля `isExpanded`, `isBookmarked` не экспортируются):

```yaml
- id: "1C 1D 1H"
  context:
    sequence: ["1C", "1D", "1H"]
  meaning:
    type: rebid
    forcing: NF
    hcp:
      min: 11
      max: 16
    notes: ""
    accepted: true
```

## Структура проекта

```text
app/                 # layout/page + global styles
components/          # TopBar / LeftPanel / CenterPanel / RightPanel / SequenceRow
store/               # Zustand store (nodes + UI state + actions)
lib/                 # utils (format/sort/colors)
hooks/               # client hooks
public/              # статические ассеты
docs/                # vision/jtbd/roadmap + C4 + ADR
specs/               # SDD-спеки и планы реализации
fix/                 # журнал исправлений
expirience/          # постмортемы инцидентов
.github/             # CI + issue forms + PR template + CODEOWNERS
```

## Product and Architecture Docs

- Vision:
  - `docs/VISION.md`
  - `docs/WORKFLOW.md`
  - `docs/IDEA_CONTEXT.md`
  - `docs/IDEAS_SECTION_INDEX.md`
  - `docs/source/IDEAS.md`
  - `docs/source/PRIORITIES.md`
  - `docs/archive/TZ.md` (archive)
  - `docs/JTBD.md`
  - `docs/GLOSSARY.md`
  - `docs/ROADMAP.md`
- Architecture:
  - `docs/bounded-contexts.md`
  - `docs/c4/c1-context.mmd`
  - `docs/c4/c2-container.mmd`
  - `docs/c4/c3-components-webapp.mmd`
  - `docs/c4/c3-components-api.mmd`
  - `docs/c4/c3-components-bot.mmd`
  - `docs/c4/c4-code-guidelines.md`
  - `docs/adr/ADR-0000-template.md`
  - `docs/adr/ADR-0001-api-first-modular-monolith.md`
  - `docs/adr/ADR-0002-drizzle-trpc-default-stack.md`

Правило: если PR меняет архитектурные границы, в PR template должен быть указан ADR link.

## SDD workflow (Spec-Driven Development)

В репозитории добавлена базовая SDD-инфраструктура:
- Issue Forms (`Spec Proposal`, `Bug Report`, `Refactor Request`),
- PR template с обязательным `Spec Link`,
- CI (`Spec Check`, `Lint`, `Typecheck`, `Build`),
- `CODEOWNERS`,
- чеклист GitHub-настроек: `.github/SDD_SETUP.md`.

SDD backfill для миграции PR-1..PR-4:
- `specs/002-sdd-migration-backfill/spec.md`
- `specs/002-sdd-migration-backfill/plan.md`
- `specs/002-sdd-migration-backfill/tasks.md`
- `specs/002-sdd-migration-backfill/linear-mapping.md`

SDD пакет для текущей реализации PR-5:
- `specs/003-pr5-trpc-client-preserve-ui/spec.md`
- `specs/003-pr5-trpc-client-preserve-ui/plan.md`
- `specs/003-pr5-trpc-client-preserve-ui/tasks.md`
- `specs/003-pr5-trpc-client-preserve-ui/linear-mapping.md`

## UI Regression Baseline

Для сохранения текущего UX модуля при миграции backend:

- чеклист: `tests/ui-baseline/bidding-module-regression.md`
- папка эталонных скриншотов: `tests/ui-baseline/screenshots/`

Доменные контракты (DTO + инварианты):

- `lib/domain/bidding/contracts.ts`

## Ближайший roadmap

Текущий следующий этап: platform hardening для встраивания редактора в портал.
Спеки и порядок реализации описаны в:
- `specs/005-platform-core-hardening/README.md`
- `specs/005-platform-core-hardening/spec.md`
- `specs/005-platform-core-hardening/plan.md`

## Troubleshooting

- Если UI выглядит загруженным, но не интерактивен:
  1. остановить dev-сервер,
  2. удалить `.next`,
  3. запустить `npm run dev` снова,
  4. проверить, что `/_next/static/chunks/*` отдаются с `200`.

- Если `build` падает на `next/font` (сетевые таймауты), повторить запуск; в CI для этого есть retry.

- Если нужно сбросить локальный автосохраненный черновик:
  - откройте DevTools -> Application -> Local Storage,
  - удалите ключ `bridge-system-editor:draft:v1`.
