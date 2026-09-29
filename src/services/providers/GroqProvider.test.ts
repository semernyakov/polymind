import { describe, it, expect, vi } from 'vitest';

vi.mock('groq-sdk', () => ({
  Groq: class {
    constructor(_o: unknown) {}
  },
}));
vi.mock('obsidian', () => ({
  Notice: class {},
  requestUrl: vi.fn(),
}));

import { GroqService } from '../groqService';

describe('groqService re-export', () => {
  it('GroqService is exported from the legacy path', () => {
    expect(typeof GroqService).toBe('function');
  });
});
