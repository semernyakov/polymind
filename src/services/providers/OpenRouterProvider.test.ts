import { describe, it, expect, vi } from 'vitest';

vi.mock('../../localization', () => ({
  t: (key: string) => key,
}));
vi.mock('groq-sdk', () => ({ Groq: class { constructor(_o: unknown) {} } }));
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

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
