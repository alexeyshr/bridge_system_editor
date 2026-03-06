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
```

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
features/left-panel/ # SDD-спеки по развитию левой панели
fix/                 # журнал исправлений
expirience/          # постмортемы инцидентов
.github/             # CI + issue forms + PR template + CODEOWNERS
```

## SDD workflow (Spec-Driven Development)

В репозитории добавлена базовая SDD-инфраструктура:
- Issue Forms (`Spec Proposal`, `Bug Report`, `Refactor Request`),
- PR template с обязательным `Spec Link`,
- CI (`Spec Check`, `Lint`, `Typecheck`, `Build`),
- `CODEOWNERS`,
- чеклист GitHub-настроек: `.github/SDD_SETUP.md`.

## Ближайший roadmap

Основная следующая задача: развитие левой панели до пользовательских секций и smart views.
Спеки и порядок реализации описаны в:
- `features/left-panel/README.md`
- `features/left-panel/00-decisions.md`

## Troubleshooting

- Если UI выглядит загруженным, но не интерактивен:
  1. остановить dev-сервер,
  2. удалить `.next`,
  3. запустить `npm run dev` снова,
  4. проверить, что `/_next/static/chunks/*` отдаются с `200`.

- Если `build` падает на `next/font` (сетевые таймауты), повторить запуск; в CI для этого есть retry.
