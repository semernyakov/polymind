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
