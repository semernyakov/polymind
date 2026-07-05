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
