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
    // Dedup by `id` only (not provider+id): `id` is the <select> option value and must be
    // globally unique across providers; Groq ids never contain '/' while OpenRouter ids always
    // do (e.g. "openai/gpt-4o"), so cross-provider collisions cannot occur in practice.
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
