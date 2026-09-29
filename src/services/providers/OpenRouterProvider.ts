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
      const saved = this._plugin.settings.openRouterAvailableModels;
      const models = Array.isArray(saved) && saved.length > 0 ? saved : openRouterModels;
      return { models, rateLimits: {} };
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
