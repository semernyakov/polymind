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
