// Роли сообщений
export type MessageRole = 'user' | 'assistant' | 'system';

// Сообщение чата
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  hasThinkContent?: boolean;
  isStreaming?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    queue_time?: number;
    prompt_time?: number;
    completion_time?: number;
    total_time?: number;
  };
}

// История чата
export interface ChatHistory {
  version: 1;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Настройки конкретной модели
export interface ModelSettings {
  temperature: number;
  maxTokens: number;
}

// Категория модели
export type ModelCategory = 'text' | 'audio' | 'vision';

// Статус релиза модели
export type ModelReleaseStatus = 'main' | 'preview';

// Разработчик модели
export interface ModelDeveloper {
  name: string;
  url?: string;
}

// Параметры модели
export interface ModelParams {
  maxTokens: number;
  maxDuration?: number;
  maxFileSize?: number;
  tokensPerMinute?: number;
}

// Enum для моделей (расширять по мере необходимости)

export enum GroqModel {
  _LLAMA3_70B = 'llama3-70b-8192',
}

// Основная информация о модели
export interface ModelInfo extends ModelParams {
  id: GroqModel | string;
  name: string;
  description: string;
  category: ModelCategory;
  developer: ModelDeveloper;
  releaseStatus?: string;
  active?: boolean;
  created?: number;
  updated?: number;
}

// Использовать этот тип для динамических моделей из API
export type DynamicModelInfo = Omit<ModelInfo, 'developer' | 'releaseStatus'> & {
  developer?: ModelDeveloper;
  releaseStatus?: ModelReleaseStatus;
};
