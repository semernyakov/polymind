# OpenRouter Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenRouter as a second LLM provider alongside Groq, with a provider-centric settings UI and a unified model list that routes each message to the provider of the chosen model.

**Architecture:** Introduce a `ChatProvider` interface with two implementations (`GroqProvider` — refactored from the current `GroqService`; `OpenRouterProvider` — the same `groq-sdk` client pointed at OpenRouter's OpenAI-compatible base URL) and a `ProviderRegistry` that routes by each model's `provider` field and merges both providers' models into one list.

**Tech Stack:** TypeScript, Obsidian API, React (tsx), `groq-sdk ^0.19.0` (supports custom `baseURL`), Vitest ^4.1.7.

## Global Constraints

- Provider field is optional and back-compatible: a `GroqModelInfo` with no `provider` MUST be treated as `'groq'`. Existing `data.json` must load without migration.
- OpenRouter base URL: `https://openrouter.ai/api/v1`. Models endpoint: `https://openrouter.ai/api/v1/models`.
- Do NOT rename or remove existing settings fields (`apiKey`, `model`, `groqAvailableModels`, `groqRateLimits`).
- Keep `plugin.groqService` working as an alias to the Groq provider (existing code depends on it).
- No major dependency upgrades. Reuse existing retry/stream/error logic — do not duplicate it.
- New user-facing strings must be added for both `ru` and `en` locales.
- Tests colocate next to source (`*.test.ts`), matching `src/data/externalModels.test.ts`.
- Run a single test file with `npx vitest run <path>`; full suite with `npm test`.

---

### Task 1: Data model — `provider` field + OpenRouter settings

**Files:**
- Modify: `src/settings/GroqChatSettings.ts`
- Modify: `src/services/providers/types.ts` (Create)

**Interfaces:**
- Produces: `type ProviderId = 'groq' | 'openrouter'`; `GroqModelInfo.provider?: ProviderId`; settings fields `openRouterApiKey: string`, `openRouterAvailableModels?: GroqModelInfo[]`, `openRouterRateLimits?: RateLimitsType`; `ChatProvider` interface.

- [ ] **Step 1: Create the provider types file**

Create `src/services/providers/types.ts`:

```ts
import type { GroqModelInfo } from '../../settings/GroqChatSettings';
import type { RateLimitsType } from '../groqService';
import type { Message } from '../../types/types';

export type ProviderId = 'groq' | 'openrouter';

export interface ChatProvider {
  readonly id: ProviderId;
  updateApiKey(_key: string): void;
  validateKey(_key: string): Promise<boolean>;
  getModelsWithLimits(_forceRefresh?: boolean): Promise<{
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
  }>;
  sendMessage(
    _content: string,
    _model: string,
    _onChunk?: (_chunk: string) => void,
  ): Promise<Message>;
  handleError(_error: unknown): Error;
}
```

- [ ] **Step 2: Add `provider` to `GroqModelInfo` and OpenRouter settings fields**

In `src/settings/GroqChatSettings.ts`, add to `GroqModelInfo` (after `isPreview?: boolean;`):

```ts
  /** Провайдер, к которому относится модель. Отсутствие трактуется как 'groq'. */
  provider?: 'groq' | 'openrouter';
```

Add to `GroqChatSettings` interface (after `groqRateLimits?`):

```ts
  openRouterApiKey: string;
  openRouterAvailableModels?: GroqModelInfo[];
  openRouterRateLimits?: RateLimitsType;
```

Add to `DEFAULT_SETTINGS` object (after `apiKey: '',`):

```ts
  openRouterApiKey: '',
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/settings/GroqChatSettings.ts src/services/providers/types.ts
git commit -m "feat(providers): add provider field and OpenRouter settings/ChatProvider interface"
```

---

### Task 2: Curated OpenRouter catalog + merge helper

**Files:**
- Create: `src/data/openRouterModels.ts`
- Test: `src/data/openRouterModels.test.ts`

**Interfaces:**
- Consumes: `GroqModelInfo` (Task 1).
- Produces: `export const openRouterModels: GroqModelInfo[]`; `export function mergeOpenRouterModels(curated: GroqModelInfo[], apiModels: GroqModelInfo[]): GroqModelInfo[]` — returns curated followed by API models not already present by `id`, no duplicates.

- [ ] **Step 1: Write the failing test**

Create `src/data/openRouterModels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { openRouterModels, mergeOpenRouterModels } from './openRouterModels';

describe('openRouterModels catalog', () => {
  it('every entry is a valid active OpenRouter model with unique id', () => {
    const ids = new Set<string>();
    for (const m of openRouterModels) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.provider).toBe('openrouter');
      expect(m.isActive).toBe(true);
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
    }
    expect(openRouterModels.length).toBeGreaterThan(0);
  });
});

describe('mergeOpenRouterModels', () => {
  it('appends API models absent from curated, deduping by id, curated first', () => {
    const curated = [
      { id: 'anthropic/claude', name: 'Claude', provider: 'openrouter' as const, isActive: true },
    ];
    const api = [
      { id: 'anthropic/claude', name: 'Claude dup', provider: 'openrouter' as const, isActive: true },
      { id: 'x/new', name: 'New', provider: 'openrouter' as const, isActive: true },
    ];
    const out = mergeOpenRouterModels(curated, api);
    expect(out.map(m => m.id)).toEqual(['anthropic/claude', 'x/new']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/openRouterModels.test.ts`
Expected: FAIL — cannot resolve `./openRouterModels`.

- [ ] **Step 3: Write the catalog and merge helper**

Create `src/data/openRouterModels.ts`:

```ts
import type { GroqModelInfo } from '../settings/GroqChatSettings';

/**
 * Курируемый список топовых моделей OpenRouter (OpenAI-совместимые id).
 * Активны и рабочи через OpenRouter при наличии ключа. Полный список
 * догружается кнопкой в настройках через mergeOpenRouterModels.
 */
export const openRouterModels: GroqModelInfo[] = [
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'openrouter', isActive: true, developer: { name: 'Anthropic' }, owned_by: 'anthropic' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'openrouter', isActive: true, developer: { name: 'Anthropic' }, owned_by: 'anthropic' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'openrouter', isActive: true, developer: { name: 'Google' }, owned_by: 'google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'openrouter', isActive: true, developer: { name: 'Google' }, owned_by: 'google' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', isActive: true, developer: { name: 'OpenAI' }, owned_by: 'openai' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', provider: 'openrouter', isActive: true, developer: { name: 'OpenAI' }, owned_by: 'openai' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', isActive: true, developer: { name: 'Meta' }, owned_by: 'meta-llama' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'openrouter', isActive: true, developer: { name: 'DeepSeek' }, owned_by: 'deepseek' },
];

export function mergeOpenRouterModels(
  curated: GroqModelInfo[],
  apiModels: GroqModelInfo[],
): GroqModelInfo[] {
  const seen = new Set(curated.map(m => m.id));
  const extra = apiModels.filter(m => !seen.has(m.id));
  return [...curated, ...extra];
}
```

> Note: the exact model ids/names are a reasonable current snapshot; the implementer may refresh them against openrouter.ai/models but must keep `provider: 'openrouter'`, `isActive: true`, and unique ids.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/openRouterModels.test.ts`
Expected: PASS (both suites).

- [ ] **Step 5: Commit**

```bash
git add src/data/openRouterModels.ts src/data/openRouterModels.test.ts
git commit -m "feat(providers): curated OpenRouter model catalog + merge helper"
```

---

### Task 3: OpenRouterProvider

**Files:**
- Create: `src/services/providers/OpenRouterProvider.ts`
- Test: `src/services/providers/OpenRouterProvider.test.ts`

**Interfaces:**
- Consumes: `ChatProvider`, `ProviderId` (Task 1); `openRouterModels`, `mergeOpenRouterModels` (Task 2); `GroqPluginInterface` (`src/types/plugin.ts`).
- Produces: `class OpenRouterProvider implements ChatProvider` with `id = 'openrouter'`. `handleError(error)` maps messages containing `401`→`invalidApiKey`, `429`→`rateLimitExceeded`, `500`→`serverError`, `network`→`networkError`, else passthrough.

- [ ] **Step 1: Write the failing test (error mapping — pure, no network)**

Create `src/services/providers/OpenRouterProvider.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../localization', () => ({
  t: (key: string) => key,
}));
vi.mock('groq-sdk', () => ({ Groq: class { constructor(_o: unknown) {} } }));

import { OpenRouterProvider } from './OpenRouterProvider';

const plugin = { settings: { openRouterApiKey: '' } } as never;

describe('OpenRouterProvider.handleError', () => {
  const p = new OpenRouterProvider(plugin);
  it('maps 401 to invalidApiKey', () => {
    expect(p.handleError(new Error('status 401')).message).toBe('invalidApiKey');
  });
  it('maps 429 to rateLimitExceeded', () => {
    expect(p.handleError(new Error('got 429')).message).toBe('rateLimitExceeded');
  });
  it('passes through unknown Error', () => {
    expect(p.handleError(new Error('weird')).message).toBe('weird');
  });
  it('has id openrouter', () => {
    expect(p.id).toBe('openrouter');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/providers/OpenRouterProvider.test.ts`
Expected: FAIL — cannot resolve `./OpenRouterProvider`.

- [ ] **Step 3: Implement OpenRouterProvider**

Create `src/services/providers/OpenRouterProvider.ts`:

```ts
import { Groq } from 'groq-sdk';
import { requestUrl } from 'obsidian';
import type { GroqPluginInterface } from '../../types/plugin';
import type { Message } from '../../types/types';
import type { GroqModelInfo } from '../../settings/GroqChatSettings';
import type { RateLimitsType } from '../groqService';
import { t } from '../../localization';
import { openRouterModels, mergeOpenRouterModels } from '../../data/openRouterModels';
import type { ChatProvider, ProviderId } from './types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface OpenRouterApiModel {
  id: string;
  name?: string;
  description?: string;
}

export class OpenRouterProvider implements ChatProvider {
  public readonly id: ProviderId = 'openrouter';
  private client: Groq;

  constructor(private readonly _plugin: GroqPluginInterface) {
    this.client = this.makeClient(this._plugin.settings.openRouterApiKey);
  }

  private makeClient(apiKey: string): Groq {
    return new Groq({
      apiKey: apiKey || 'missing',
      baseURL: OPENROUTER_BASE_URL,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/semernyakov/polymind',
        'X-Title': 'PolyMind',
      },
    });
  }

  public updateApiKey(apiKey: string): void {
    this.client = this.makeClient(apiKey);
  }

  public async validateKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
      const res = await requestUrl({
        url: `${OPENROUTER_BASE_URL}/models`,
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  public async getModelsWithLimits(forceRefresh = false): Promise<{
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
  }> {
    if (!forceRefresh) {
      return { models: openRouterModels, rateLimits: {} };
    }
    try {
      const res = await requestUrl({
        url: `${OPENROUTER_BASE_URL}/models`,
        method: 'GET',
        headers: { Authorization: `Bearer ${this._plugin.settings.openRouterApiKey}` },
      });
      const data: OpenRouterApiModel[] = (res.json && res.json.data) || [];
      const apiModels: GroqModelInfo[] = data.map(m => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description || '',
        provider: 'openrouter',
        isActive: true,
        owned_by: m.id.split('/')[0],
        developer: { name: m.id.split('/')[0] },
      }));
      return { models: mergeOpenRouterModels(openRouterModels, apiModels), rateLimits: {} };
    } catch {
      return { models: openRouterModels, rateLimits: {} };
    }
  }

  public async sendMessage(
    content: string,
    model: string,
    onChunk?: (_chunk: string) => void,
  ): Promise<Message> {
    if (!content.trim()) throw new Error(t('emptyMessage'));
    if (!this._plugin.settings.openRouterApiKey) {
      throw new Error(t('openRouterKeyMissing'));
    }
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content }],
        temperature: this._plugin.settings.temperature,
        max_tokens: this._plugin.settings.maxTokens,
        stream: true,
      });
      let full = '';
      let messageId = '';
      for await (const chunk of stream) {
        if (!messageId && chunk.id) messageId = chunk.id;
        const piece = chunk.choices[0]?.delta?.content;
        if (piece) {
          full += piece;
          onChunk?.(piece);
        }
      }
      if (!full) throw new Error('Empty response from API');
      return {
        id: messageId || Date.now().toString(),
        role: 'assistant',
        content: full,
        timestamp: Date.now(),
        isStreaming: false,
        hasThinkContent: false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public handleError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('401')) return new Error(t('invalidApiKey'));
      if (error.message.includes('429')) return new Error(t('rateLimitExceeded'));
      if (error.message.includes('500')) return new Error(t('serverError'));
      if (error.message.includes('network')) return new Error(t('networkError'));
      return error;
    }
    return new Error(t('unknownError'));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/providers/OpenRouterProvider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/providers/OpenRouterProvider.ts src/services/providers/OpenRouterProvider.test.ts
git commit -m "feat(providers): OpenRouterProvider with streaming + curated/API models"
```

---

### Task 4: GroqProvider (refactor GroqService to ChatProvider)

**Files:**
- Create: `src/services/providers/GroqProvider.ts`
- Modify: `src/services/groqService.ts` (re-export)
- Test: `src/services/providers/GroqProvider.test.ts`

**Interfaces:**
- Consumes: `ChatProvider`, `ProviderId` (Task 1).
- Produces: `class GroqProvider implements ChatProvider` (`id='groq'`), whose `getModelsWithLimits` tags every model with `provider: 'groq'`. `src/services/groqService.ts` re-exports `GroqProvider as GroqService` so existing imports keep working.

- [ ] **Step 1: Move GroqService into GroqProvider**

Create `src/services/providers/GroqProvider.ts` with the full current contents of `src/services/groqService.ts`, renaming the class to `GroqProvider`, adding `implements ChatProvider` and `public readonly id: ProviderId = 'groq';`, and updating relative import depths (`../../` instead of `../`). Rename `validateApiKey` → keep as `validateApiKey` but also add `validateKey` satisfying the interface:

```ts
public validateKey(_apiKey: string): Promise<boolean> {
  return this.validateApiKey(_apiKey);
}
public getModelsWithLimits(_forceRefresh = false) {
  return this.getAvailableModelsWithLimits(_forceRefresh);
}
```

In the `.map(...)` inside `getAvailableModelsWithLimits`, add `provider: 'groq'` to each returned `GroqModelInfo`.

- [ ] **Step 2: Re-export from the old path**

Replace the body of `src/services/groqService.ts` with:

```ts
export type { RateLimitsType } from './providers/GroqProvider';
export { GroqProvider as GroqService } from './providers/GroqProvider';
```

Move the `RateLimitsType` export into `GroqProvider.ts` (it is defined there now).

- [ ] **Step 3: Write the test**

Create `src/services/providers/GroqProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GroqService } from '../groqService';

describe('groqService re-export', () => {
  it('GroqService is exported from the legacy path', () => {
    expect(typeof GroqService).toBe('function');
  });
});
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/services/providers/GroqProvider.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors (all existing `groqService` importers still resolve).

- [ ] **Step 5: Commit**

```bash
git add src/services/providers/GroqProvider.ts src/services/groqService.ts src/services/providers/GroqProvider.test.ts
git commit -m "refactor(providers): GroqService -> GroqProvider implementing ChatProvider"
```

---

### Task 5: ProviderRegistry

**Files:**
- Create: `src/services/providers/ProviderRegistry.ts`
- Test: `src/services/providers/ProviderRegistry.test.ts`

**Interfaces:**
- Consumes: `ChatProvider`, `ProviderId` (Task 1); `GroqProvider` (Task 4); `OpenRouterProvider` (Task 3).
- Produces: `class ProviderRegistry` with `getProvider(id: ProviderId): ChatProvider`, `routeForModel(modelId: string): ChatProvider` (looks up the model in the merged list; defaults to groq when unknown), `getAllModels(forceRefresh?: boolean): Promise<GroqModelInfo[]>` (concatenates both providers' models, dedup by `id`).

- [ ] **Step 1: Write the failing test**

Create `src/services/providers/ProviderRegistry.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../localization', () => ({ t: (k: string) => k }));
vi.mock('groq-sdk', () => ({ Groq: class { constructor(_o: unknown) {} } }));

import { ProviderRegistry } from './ProviderRegistry';
import type { ChatProvider } from './types';
import type { GroqModelInfo } from '../../settings/GroqChatSettings';

function stub(id: 'groq' | 'openrouter', models: GroqModelInfo[]): ChatProvider {
  return {
    id,
    updateApiKey: () => {},
    validateKey: async () => true,
    getModelsWithLimits: async () => ({ models, rateLimits: {} }),
    sendMessage: async () => ({ id: '1', role: 'assistant', content: '', timestamp: 0, isStreaming: false, hasThinkContent: false }),
    handleError: (e: unknown) => (e instanceof Error ? e : new Error('x')),
  };
}

const groq = stub('groq', [{ id: 'llama', name: 'Llama', provider: 'groq' }]);
const or = stub('openrouter', [{ id: 'anthropic/claude', name: 'Claude', provider: 'openrouter' }]);

describe('ProviderRegistry', () => {
  it('getAllModels merges both providers deduped', async () => {
    const r = new ProviderRegistry(groq, or);
    const models = await r.getAllModels();
    expect(models.map(m => m.id).sort()).toEqual(['anthropic/claude', 'llama']);
  });
  it('routeForModel routes by provider field', async () => {
    const r = new ProviderRegistry(groq, or);
    await r.getAllModels();
    expect(r.routeForModel('anthropic/claude').id).toBe('openrouter');
    expect(r.routeForModel('llama').id).toBe('groq');
  });
  it('routeForModel defaults to groq for unknown model', async () => {
    const r = new ProviderRegistry(groq, or);
    await r.getAllModels();
    expect(r.routeForModel('nope').id).toBe('groq');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/providers/ProviderRegistry.test.ts`
Expected: FAIL — cannot resolve `./ProviderRegistry`.

- [ ] **Step 3: Implement ProviderRegistry**

Create `src/services/providers/ProviderRegistry.ts`:

```ts
import type { GroqModelInfo } from '../../settings/GroqChatSettings';
import type { ChatProvider, ProviderId } from './types';

export class ProviderRegistry {
  private modelIndex = new Map<string, ProviderId>();

  constructor(
    private readonly groq: ChatProvider,
    private readonly openrouter: ChatProvider,
  ) {}

  public getProvider(id: ProviderId): ChatProvider {
    return id === 'openrouter' ? this.openrouter : this.groq;
  }

  public async getAllModels(forceRefresh = false): Promise<GroqModelInfo[]> {
    const [g, o] = await Promise.all([
      this.groq.getModelsWithLimits(forceRefresh),
      this.openrouter.getModelsWithLimits(forceRefresh),
    ]);
    const seen = new Set<string>();
    const merged: GroqModelInfo[] = [];
    this.modelIndex.clear();
    for (const m of [...g.models, ...o.models]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      this.modelIndex.set(m.id, m.provider ?? 'groq');
      merged.push(m);
    }
    return merged;
  }

  public routeForModel(modelId: string): ChatProvider {
    return this.getProvider(this.modelIndex.get(modelId) ?? 'groq');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/providers/ProviderRegistry.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/services/providers/ProviderRegistry.ts src/services/providers/ProviderRegistry.test.ts
git commit -m "feat(providers): ProviderRegistry routing + merged model list"
```

---

### Task 6: Wire the registry into the plugin

**Files:**
- Modify: `src/types/plugin.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `ProviderRegistry` (Task 5), `OpenRouterProvider` (Task 3), `GroqService`/`GroqProvider` (Task 4).
- Produces: `plugin.providers: ProviderRegistry` and `plugin.openRouterProvider: OpenRouterProvider`; `plugin.groqService` stays as the Groq provider instance.

- [ ] **Step 1: Extend the plugin interface**

In `src/types/plugin.ts`, add to the interface (near `readonly groqService: GroqService;`):

```ts
  readonly openRouterProvider: import('../services/providers/OpenRouterProvider').OpenRouterProvider;
  readonly providers: import('../services/providers/ProviderRegistry').ProviderRegistry;
```

- [ ] **Step 2: Construct providers in main.ts**

In `src/main.ts`, where `this.groqService = new GroqService(this)` is created (around line 65), add below it:

```ts
this.openRouterProvider = new OpenRouterProvider(this);
this.providers = new ProviderRegistry(this.groqService, this.openRouterProvider);
```

Add the class fields near `groqService!: GroqService;`:

```ts
openRouterProvider!: OpenRouterProvider;
providers!: ProviderRegistry;
```

Add imports at the top of `src/main.ts`:

```ts
import { OpenRouterProvider } from './services/providers/OpenRouterProvider';
import { ProviderRegistry } from './services/providers/ProviderRegistry';
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; `main.js` produced.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/types/plugin.ts
git commit -m "feat(providers): register ProviderRegistry and OpenRouterProvider on plugin"
```

---

### Task 7: Route message send + unified model list in chat

**Files:**
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/components/GroupedModelSelector.tsx`

**Interfaces:**
- Consumes: `plugin.providers` (Task 6).
- Produces: chat send goes through `plugin.providers.routeForModel(model).sendMessage(...)`; model list comes from `plugin.providers.getAllModels()`; selector groups by `provider`.

- [ ] **Step 1: Route the send call**

In `src/components/ChatPanel.tsx`, find where `plugin.groqService.sendMessage(` is called and replace the receiver with the routed provider:

```ts
const provider = plugin.providers.routeForModel(model);
await provider.sendMessage(content, model, onChunk);
```

- [ ] **Step 2: Source the model list from the registry**

In `ChatPanel.tsx` where `plugin.groqService.getAvailableModelsWithLimits()` is called (around line 206-207), replace with:

```ts
const models = await plugin.providers.getAllModels();
```

(and drop the rate-limits destructuring if only `models` is used downstream; keep Groq rate limits via `plugin.groqService.rateLimits` if still displayed.)

- [ ] **Step 3: Group the selector by provider**

In `src/components/GroupedModelSelector.tsx`, in the grouping logic, add a top-level grouping key `m.provider ?? 'groq'` (label: `Groq` / `OpenRouter`), keeping the existing developer sub-grouping within each provider group.

- [ ] **Step 4: Build + manual smoke**

Run: `npm run build`
Expected: builds. Manual: load the plugin in Obsidian, confirm the model dropdown shows both Groq and OpenRouter groups, and that selecting a Groq model still sends correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel.tsx src/components/GroupedModelSelector.tsx
git commit -m "feat(chat): route send by provider + unified model list grouped by provider"
```

---

### Task 8: Provider-centric settings UI + localization

**Files:**
- Modify: `src/settings/GroqChatSettingsTab.ts`
- Modify: `src/localization.ts`

**Interfaces:**
- Consumes: `plugin.openRouterProvider` (Task 6), `plugin.providers` (Task 6).
- Produces: settings sections `Groq` and `OpenRouter`; new locale keys `settings.openRouterHeading`, `openRouterApiKey`, `openRouterKeyMissing`, `settings.loadOpenRouterModels` for `ru` and `en`.

- [ ] **Step 1: Add localization strings**

In `src/localization.ts`, add to both `ru` and `en` dictionaries:

```ts
// ru
'settings.openRouterHeading': 'OpenRouter',
'openRouterApiKey': 'Ключ API OpenRouter',
'openRouterKeyMissing': 'Добавьте ключ API OpenRouter в настройках, чтобы использовать эту модель',
'settings.loadOpenRouterModels': 'Загрузить все модели из API',
// en
'settings.openRouterHeading': 'OpenRouter',
'openRouterApiKey': 'OpenRouter API key',
'openRouterKeyMissing': 'Add an OpenRouter API key in settings to use this model',
'settings.loadOpenRouterModels': 'Load all models from API',
```

- [ ] **Step 2: Restructure `display()` into provider sections**

In `src/settings/GroqChatSettingsTab.ts`, change `display()` so the API/model area is two provider blocks:

- Groq heading (reuse `settings.apiHeading`) → existing `addApiKeySetting` → Groq refresh → `addModelListBlock` filtered to `provider !== 'openrouter'`.
- New OpenRouter heading (`settings.openRouterHeading`) → new `addOpenRouterKeySetting` (mirrors `addApiKeySetting` but reads/writes `settings.openRouterApiKey`, calls `plugin.openRouterProvider.updateApiKey` and `validateKey`) → a button `settings.loadOpenRouterModels` that calls `plugin.openRouterProvider.getModelsWithLimits(true)` and saves into `settings.openRouterAvailableModels` → `addModelListBlock` filtered to `provider === 'openrouter'`.
- Keep temperature/maxTokens as a shared "Параметры" block, and History/Interface unchanged.

Add a `providerFilter` parameter to `addModelListBlock(locale, providerFilter?: 'groq' | 'openrouter')` and filter the rendered rows accordingly; when unset, render all (back-compatible).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; builds.

- [ ] **Step 4: Manual verification**

Load plugin in Obsidian → Settings: confirm a Groq section and an OpenRouter section (key field + "load all models" button + its model table). Enter an OpenRouter key, validate, load models, pick an OpenRouter model in chat, send — response streams.

- [ ] **Step 5: Commit**

```bash
git add src/settings/GroqChatSettingsTab.ts src/localization.ts
git commit -m "feat(settings): provider-centric settings UI with OpenRouter section + i18n"
```

---

### Task 9: Full suite green + lint

**Files:** none (verification task)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests pass (openRouterModels, OpenRouterProvider, GroqProvider, ProviderRegistry, existing externalModels).

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: no lint errors; `main.js` builds.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint + build green for OpenRouter provider"
```

---

## Notes for the implementer

- OpenRouter is OpenAI-compatible, so `groq-sdk`'s client works unchanged against its `baseURL`; do not add a new SDK.
- Reuse the existing `t()` localization and error-message keys where they already exist (`invalidApiKey`, `rateLimitExceeded`, `serverError`, `networkError`, `unknownError`, `emptyMessage`).
- The `externalModels` "coming soon" catalog is superseded by `openRouterModels`; if the old catalog is still merged anywhere in settings, remove that merge so models are not duplicated (Anthropic/Google now come from OpenRouter). Yandex is dropped (not on OpenRouter).
