import { describe, it, expect, vi } from 'vitest';

vi.mock('../../localization', () => ({
  t: (key: string) => key,
}));
vi.mock('groq-sdk', () => ({ Groq: class { constructor(_o: unknown) {} } }));
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

import { OpenRouterProvider } from './OpenRouterProvider';
import { openRouterModels } from '../../data/openRouterModels';

const plugin = { settings: { openRouterApiKey: '' } } as never;

describe('OpenRouterProvider.getModelsWithLimits', () => {
  it('returns the saved openRouterAvailableModels when non-empty and forceRefresh is false', async () => {
    const saved = [{ id: 'x/custom', name: 'Custom', provider: 'openrouter', isActive: true }];
    const p = new OpenRouterProvider({
      settings: { openRouterApiKey: '', openRouterAvailableModels: saved },
    } as never);
    const { models } = await p.getModelsWithLimits(false);
    expect(models).toEqual(saved);
  });

  it('falls back to the curated catalog when openRouterAvailableModels is undefined/empty', async () => {
    const pUndefined = new OpenRouterProvider({
      settings: { openRouterApiKey: '' },
    } as never);
    expect((await pUndefined.getModelsWithLimits(false)).models).toEqual(openRouterModels);

    const pEmpty = new OpenRouterProvider({
      settings: { openRouterApiKey: '', openRouterAvailableModels: [] },
    } as never);
    expect((await pEmpty.getModelsWithLimits(false)).models).toEqual(openRouterModels);
  });
});

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
