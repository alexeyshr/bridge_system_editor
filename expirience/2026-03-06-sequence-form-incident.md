## Incident Review: dev UI "упало" после изменений формы

- Date: 2026-03-06
- Scope: изменения формы `Add continuation` в `components/SequenceRow.tsx`

### Что увидел пользователь
Страница открывалась, но интерфейс выглядел сломанным/неоформленным.

### Техническая причина
Это был не баг JSX/логики формы.
Проблема в dev-runtime Next.js:

1. `/_next/static/css/app/layout.css?...` периодически отдавал `404` (страница без стилей).
2. Затем dev-сервер ушёл в `500` с:
   - `ENOENT: no such file or directory, open '.next/server/pages/_document.js'`

Это признак повреждённого/неполного dev-кэша `.next`.

### Почему я допустил ошибку
Я проверял `lint/build`, но не делал обязательный runtime smoke-check после каждого изменения UI:

- `GET /` должен быть `200`
- `GET /_next/static/css/app/layout.css?...` должен быть `200`

Также я затянул с полной очисткой `.next` при первых симптомах нестабильного dev-сервера.

### Что сделал для восстановления
1. Остановил процесс на `:3000`
2. Очистил `.next`
3. Запустил `npm run dev` заново
4. Проверил:
   - `HOME_STATUS=200`
   - `CSS_STATUS=200`

### Правило на будущее (обязательно)
После любого UI-изменения:

1. `npm run lint`
2. `npm run build`
3. Runtime-check в dev:
   - `http://localhost:3000` -> `200`
   - CSS из HTML (`/_next/static/css/app/layout.css?...`) -> `200`

Если есть `404` на CSS или `500` на `/`:

1. Остановить dev-процесс
2. Очистить `.next`
3. Запустить dev заново
4. Повторить runtime-check

