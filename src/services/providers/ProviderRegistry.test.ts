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
