# OpenRouter как второй провайдер + провайдер-центричный UI настроек — design

Дата: 2026-07-05
Ветка: polymind

## Цель

Добавить в PolyMind второго LLM-провайдера — **OpenRouter** — рядом с существующим
Groq, с реальной отправкой сообщений. OpenRouter — OpenAI-совместимый шлюз к сотням
моделей (Anthropic, Google, OpenAI, Meta, DeepSeek и др.), поэтому он превращает
прежний «coming soon» каталог внешних моделей в рабочий. Заодно — переработать вкладку
настроек в провайдер-центричную структуру.

## Принятые решения (brainstorming)

1. **Роль OpenRouter:** второй провайдер рядом с Groq (Groq остаётся).
2. **Список моделей OpenRouter:** гибрид — курируемый короткий список топовых по
   умолчанию + кнопка «загрузить все из API».
3. **Выбор в чате:** единый список моделей обоих провайдеров; отправка автоматически
   роутится по `provider` выбранной модели.
4. **UI настроек:** провайдер-центричная структура (секция на провайдера).
5. **Архитектура:** абстракция `ChatProvider` + реестр провайдеров (подход A).

## Контекст и находки

- `GroqService` (`src/services/groqService.ts`, 289 строк) — единственный провайдер.
  Отправка: `groq-sdk` клиент, `chat.completions.create({ stream: true })`. Список
  моделей: `requestUrl` к `api.groq.com/openai/v1/models`. Логика retry/error/стриминга
  переиспользуема.
- `groq-sdk ^0.19.0` **поддерживает `baseURL`** (`ClientOptions.baseURL`) — значит
  OpenRouterProvider может использовать тот же клиент с `baseURL:
  https://openrouter.ai/api/v1` и переиспользовать стриминг. Отдельный SSE-код не нужен.
- Модели хранятся в `settings.groqAvailableModels` (`data.json`), обновляются из Groq
  API кнопкой refresh (полная перезапись — каталоги надо домерживать при построении).
- Потребители сервиса (точки роутинга): `main.ts` (создание сервиса, валидация ключа),
  `types/plugin.ts` (`plugin.groqService`), `components/ChatPanel.tsx`
  (`getAvailableModelsWithLimits`), `components/GroupedModelSelector.tsx`
  (`getAvailableModels`).
- Уже существует спека `2026-05-27-external-models-catalog-design.md`: каталог
  Anthropic/Google/Yandex как неактивный тизер. Настоящая спека **заменяет** этот подход
  для Anthropic/Google (теперь рабочие через OpenRouter). Vitest уже настроен той
  задачей (`vitest ^4.1.7`, `vitest.config.ts`).
- `GroqModelInfo` имеет `developer`, `owned_by`, `isActive`, `isPreview`, но **не имеет**
  поля провайдера.

## Дизайн

### 1. Модель данных

**`GroqModelInfo`** (`src/settings/GroqChatSettings.ts`) — добавить поле:

- `provider?: 'groq' | 'openrouter'` — при отсутствии трактуется как `'groq'`
  (обратная совместимость со старым `data.json`).

**`GroqChatSettings`** — добавить поля:

- `openRouterApiKey: string` (дефолт `''`).
- `openRouterAvailableModels?: GroqModelInfo[]`.
- `openRouterRateLimits?: RateLimitsType`.

Groq-поля (`apiKey`, `groqAvailableModels`, …) не трогаем. `DEFAULT_SETTINGS`
дополняется `openRouterApiKey: ''`.

Единый список моделей для чата = активные `groq` + активные `openrouter` модели
(объединяются реестром).

### 2. Провайдер-слой (подход A) — `src/services/providers/`

**`types.ts` — интерфейс `ChatProvider`:**

```ts
interface ChatProvider {
  readonly id: 'groq' | 'openrouter';
  updateApiKey(key: string): void;
  validateKey(key: string): Promise<boolean>;
  getModelsWithLimits(forceRefresh?: boolean): Promise<{
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
  }>;
  sendMessage(content: string, model: string, onChunk?: (c: string) => void): Promise<Message>;
  handleError(error: unknown): Error;
}
```

**`GroqProvider.ts`** — текущий `GroqService`, приведённый к интерфейсу `ChatProvider`
(`id = 'groq'`). Логика retry/stream/error сохраняется как есть. Каждая возвращаемая
модель получает `provider: 'groq'`. Для минимизации ломающих правок старый путь
`services/groqService.ts` реэкспортирует `GroqProvider` под именем `GroqService`.

**`OpenRouterProvider.ts`** — `id = 'openrouter'`. Клиент:
`new Groq({ apiKey, baseURL: 'https://openrouter.ai/api/v1', dangerouslyAllowBrowser: true })`
плюс заголовки `HTTP-Referer` и `X-Title` (рекомендованы OpenRouter для атрибуции;
безопасные значения плагина). `getModelsWithLimits`: базово отдаёт курируемый каталог
(п.3), при `forceRefresh`/кнопке — домерживает полный список из
`GET /api/v1/models`. Каждая модель получает `provider: 'openrouter'`.

**`ProviderRegistry.ts`** — держит инстансы обоих провайдеров:

- `routeForModel(modelId): ChatProvider` — находит провайдера по `provider` модели в
  объединённом списке; если не найдено — дефолт `groq`.
- `getAllModels(forceRefresh?): Promise<GroqModelInfo[]>` — объединяет модели обоих
  провайдеров, дедуп по `(provider, id)`, сохраняет порядок.
- `getProvider(id)`.

Роутинг: `main.ts`, `ChatPanel.tsx`, `GroupedModelSelector.tsx` работают через реестр
вместо прямого `groqService`. `plugin.groqService` сохраняется как алиас на
groq-провайдера для обратной совместимости существующего кода; новый код использует
`plugin.providers` (реестр).

### 3. Курируемый каталог OpenRouter — `src/data/openRouterModels.ts`

Экспортирует `GroqModelInfo[]` топовых моделей с корректными OpenRouter-id и
`provider: 'openrouter'`, `isActive: true`:

- `anthropic/claude-*` (актуальные Claude),
- `google/gemini-*`,
- `openai/gpt-*`,
- `meta-llama/*`,
- `deepseek/*`.

Заменяет прежний `externalModels` «coming soon». Yandex убираем (нет в OpenRouter).
Кнопка «загрузить все из API» домерживает полный список без затирания курируемого
(чистая функция мержа по образцу `mergeExternalModels`, дедуп по id).

### 4. UI настроек (провайдер-центрично) — `GroqChatSettingsTab.ts`

Рефактор `display()`:

- Секция **Groq**: заголовок → поле ключа + валидация/статус + кнопка refresh →
  таблица его моделей (`addModelListBlock`, отфильтрованная по `provider === 'groq'`).
- Секция **OpenRouter**: заголовок → поле ключа + валидация/статус → кнопка «загрузить
  модели» → таблица его моделей (курируемые + загруженные, `provider === 'openrouter'`).
- Общий блок **Параметры**: temperature, maxTokens.
- Секции **История**, **Интерфейс** — без изменений.

`GroupedModelSelector.tsx` — верхний уровень группировки по `provider`
(Groq / OpenRouter), внутри — по developer как сейчас.

### 5. Обработка ошибок и edge-cases

- Каждый провайдер реализует `handleError` с маппингом 401/429/500/network →
  локализованные строки (переиспользуем текущий маппинг Groq).
- Отправка на openrouter-модель при пустом `openRouterApiKey` → понятная ошибка
  «добавьте ключ OpenRouter» (новая строка локализации), проверяется до запроса.
- `validateKey` OpenRouter — лёгкий запрос (`GET /api/v1/models` с ключом или пробный
  `max_tokens:1`).

### 6. Обратная совместимость / миграция

- Старый `data.json` (только groq) работает без миграции: отсутствующий `provider`
  трактуется как `groq`, `openRouterApiKey` дефолтит в `''`, дефолтная модель — groq.
- Никаких деструктивных переименований существующих полей настроек.

### 7. Тестирование (Vitest)

Покрыть **новый код**:

- `ProviderRegistry` — `routeForModel` выбирает провайдера по `provider`; дефолт groq
  при неизвестной модели; `getAllModels` объединяет и дедупит, сохраняя порядок.
- `openRouterModels` — каталог валиден: непустые уникальные `id`,
  `provider === 'openrouter'`, `isActive === true`.
- Мерж полного списка из API — домерживает без дублей по `id`, курируемые сохраняются.
- Маппинг ошибок OpenRouterProvider (401/429/500/network) — с моком fetch/клиента.

## Вне scope (зафиксировано)

- Реальная поддержка Yandex (нет в OpenRouter).
- Мультимодальность (изображения/аудио) через OpenRouter.
- Детальный биллинг/квоты OpenRouter в UI (кроме базовых rate-limit из заголовков).
- Мажорные обновления существующих зависимостей.
- Чистка мёртвого `models.json` (отмечено ещё в прошлой спеке).

## Файлы (ожидаемые изменения)

Новые:
- `src/services/providers/types.ts`
- `src/services/providers/GroqProvider.ts`
- `src/services/providers/OpenRouterProvider.ts`
- `src/services/providers/ProviderRegistry.ts`
- `src/data/openRouterModels.ts`
- тесты: `ProviderRegistry.test.ts`, `openRouterModels.test.ts`

Изменяемые:
- `src/settings/GroqChatSettings.ts` (поля + `provider`)
- `src/settings/GroqChatSettingsTab.ts` (провайдер-центричный `display()`)
- `src/services/groqService.ts` (реэкспорт/адаптер к `GroqProvider`)
- `src/main.ts`, `src/types/plugin.ts` (реестр провайдеров)
- `src/components/ChatPanel.tsx`, `src/components/GroupedModelSelector.tsx` (роутинг/группировка)
- `src/localization.ts` (новые строки ru/en)
