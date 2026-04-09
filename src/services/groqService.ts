import { Groq } from 'groq-sdk';
import { GroqPluginInterface } from '../types/plugin';
import { Message } from '../types/types';
import type { GroqModelInfo } from '../settings/GroqChatSettings';
import { Notice, requestUrl } from 'obsidian';
import { fixModelNameCasing } from '../utils/modelUtils';
import { t } from '../localization';

// Тип для лимитов
export type RateLimitsType = {
  requestsPerDay?: number;
  tokensPerMinute?: number;
  remainingRequests?: number;
  remainingTokens?: number;
  resetRequests?: string;
  resetTokens?: string;
};

// Interface for API response model
interface GroqApiModel {
  id: string;
  object?: string;
  owned_by?: string;
  name?: string;
  description?: string;
  max_completion_tokens?: number;
  active?: boolean;
  release_status?: string;
  releaseStatus?: string;
  created?: number;
}

interface GroqServiceMethods {
  updateApiKey: (_apiKey: string) => void;
  validateApiKey: (_apiKey: string) => Promise<boolean>;
  sendMessage: (
    _content: string,
    _model: string,
    _onChunk?: (_chunk: string) => void,
  ) => Promise<Message>;
  getAvailableModels: () => Promise<{ id: string; name: string; description?: string }[]>;
  getAvailableModelsWithLimits: (_forceRefresh?: boolean) => Promise<{
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
  }>;
  handleApiError: (_error: unknown) => Error;
}

export class GroqService implements GroqServiceMethods {
  private client: Groq;
  public rateLimits: RateLimitsType = {};
  private modelCache: {
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
    timestamp: number;
  } | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 час

  constructor(private readonly _plugin: GroqPluginInterface) {
    this.client = new Groq({
      apiKey: this._plugin.settings.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  public updateApiKey(_apiKey: string): void {
    this.client = new Groq({
      apiKey: _apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.modelCache = null; // Сброс кэша при смене ключа
  }

  public async validateApiKey(_apiKey: string): Promise<boolean> {
    if (!_apiKey) return false;
    try {
      const { models } = await this.getAvailableModelsWithLimits();
      const testModel = models[0]?.id || 'llama3-8b-8192';
      const tempClient = new Groq({ apiKey: _apiKey, dangerouslyAllowBrowser: true });
      await this.retryRequest(() =>
        tempClient.chat.completions.create({
          model: testModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      );
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  public async sendMessage(
    content: string,
    model: string,
    onChunk?: (_chunk: string) => void,
  ): Promise<Message> {
    if (!content.trim()) throw new Error(t('emptyMessage'));
    if (!model || !this._plugin.settings.groqAvailableModels?.some(m => m.id === model)) {
      throw new Error(t('modelNotAvailable').replace('{{model}}', model));
    }
    try {
      if (this.rateLimits.remainingRequests === 0 || this.rateLimits.remainingTokens === 0) {
        new Notice(t('rateLimitExceeded'));
        throw new Error(t('rateLimitsExhausted'));
      }

      const streamResponse = await this.retryRequest(() =>
        this.client.chat.completions.create({
          model,
          messages: [{ role: 'user', content }],
          temperature: this._plugin.settings.temperature,
          max_tokens: Math.min(this._plugin.settings.maxTokens, this.getModelMaxTokens(model)),
          stream: true,
        }),
      );

      let fullContent = '';
      let messageId = '';

      for await (const _chunk of streamResponse) {
        void _chunk;
        if (!messageId && _chunk.id) {
          messageId = _chunk.id;
        }
        if (_chunk.choices[0]?.delta?.content) {
          const chunkContent = _chunk.choices[0].delta.content;
          fullContent += chunkContent;
          if (onChunk) {
            onChunk(chunkContent);
          }
        }
      }

      if (!fullContent) {
        throw new Error('Empty response from API');
      }

      return {
        id: messageId || Date.now().toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
        isStreaming: false,
        hasThinkContent: false,
      };
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  public async getAvailableModels(): Promise<{ id: string; name: string; description?: string }[]> {
    const { models } = await this.getAvailableModelsWithLimits();
    return models.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
    }));
  }

  public async getAvailableModelsWithLimits(_forceRefresh = false): Promise<{
    models: GroqModelInfo[];
    rateLimits: RateLimitsType;
  }> {
    // Проверка кэша
    if (
      !_forceRefresh &&
      this.modelCache &&
      Date.now() - this.modelCache.timestamp < this.CACHE_TTL
    ) {
      return { models: this.modelCache.models, rateLimits: this.modelCache.rateLimits };
    }
    try {
      const response = await this.retryRequest(async () => {
        return await requestUrl({
          url: 'https://api.groq.com/openai/v1/models',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this._plugin.settings.apiKey}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (response.status !== 200) {
        throw new Error(`API error: ${response.status}`);
      }

      const rl: RateLimitsType = {
        requestsPerDay: response.headers['x-ratelimit-limit-requests']
          ? parseInt(response.headers['x-ratelimit-limit-requests']) || undefined
          : undefined,
        tokensPerMinute: response.headers['x-ratelimit-limit-tokens']
          ? parseInt(response.headers['x-ratelimit-limit-tokens']) || undefined
          : undefined,
        remainingRequests: response.headers['x-ratelimit-remaining-requests']
          ? parseInt(response.headers['x-ratelimit-remaining-requests']) || undefined
          : undefined,
        remainingTokens: response.headers['x-ratelimit-remaining-tokens']
          ? parseInt(response.headers['x-ratelimit-remaining-tokens']) || undefined
          : undefined,
        resetRequests: response.headers['x-ratelimit-reset-requests'] || undefined,
        resetTokens: response.headers['x-ratelimit-reset-tokens'] || undefined,
      };

      this.rateLimits = rl;
      const filtered = ((response.json && response.json.data) || []).filter((m: GroqApiModel) => {
        const name = (m.name || m.id || '').toLowerCase();
        return !/speech\s*to\s*text|text\s*to\s*speech|audio|image|vision|multimodal/.test(name);
      });
      const sorted = filtered.sort((a: GroqApiModel, b: GroqApiModel) => {
        const idA = (a.id || '').toLowerCase();
        const idB = (b.id || '').toLowerCase();
        return idA.localeCompare(idB);
      });
      const models = sorted.map(
        (m: GroqApiModel): GroqModelInfo => ({
          id: m.id,
          name: fixModelNameCasing(m.name || m.id),
          description: m.description || '',
          developer: { name: m.owned_by || '—' },
          maxTokens:
            typeof m.max_completion_tokens === 'number' ? m.max_completion_tokens : undefined,
          isActive: typeof m.active === 'boolean' ? m.active : undefined,
          releaseStatus: m.release_status || m.releaseStatus || undefined,
          owned_by: m.owned_by || undefined, // Добавляем информацию о владельце
          isPreview: Boolean(
            (m.release_status || m.releaseStatus) === 'preview' ||
              (m.name && m.name.toLowerCase().includes('preview')) ||
              (m.id && m.id.toLowerCase().includes('preview')),
          ), // Определяем, является ли модель preview
        }),
      );

      // ВРЕМЕННО: логируем все поля моделей для отладки
      if (response.json && Array.isArray(response.json.data)) {
        // console.log('[GroqService] Получено моделей:', response.json.data.length);
        response.json.data.forEach((_model: GroqApiModel, _idx: number) => {
          // console.log(`[GroqService] Модель #${idx + 1}:`, model);
        });
      }

      // Сохранение в кэш
      this.modelCache = { models, rateLimits: rl, timestamp: Date.now() };
      return { models, rateLimits: rl };
    } catch (error) {
      console.error('Error fetching available models:', error);
      return { models: [], rateLimits: {} };
    }
  }

  public handleApiError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return new Error(t('invalidApiKey'));
      } else if (error.message.includes('429')) {
        return new Error(t('rateLimitExceeded'));
      } else if (error.message.includes('500')) {
        return new Error(t('serverError'));
      } else if (error.message.includes('network')) {
        return new Error(t('networkError'));
      }
      return error;
    }
    return new Error(t('unknownError'));
  }

  public async retryRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(fn, retries - 1, delay * 2);
    }
  }

  public getModelMaxTokens(modelId: string): number {
    // Default max tokens for common models
    const modelMap: Record<string, number> = {
      'llama3-8b-8192': 8192,
      'llama3-70b-8192': 8192,
      'mixtral-8x7b-32768': 32768,
      'gemma-7b-it': 8192,
    };
    return modelMap[modelId] || 4096; // Default to 4096 if model not found
  }
}
