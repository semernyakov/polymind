import { GroqModel, ModelInfo } from './types';

export const MODEL_INFO: Record<GroqModel, ModelInfo> = {
  [GroqModel._LLAMA3_70B]: {
    id: GroqModel._LLAMA3_70B,
    name: 'Llama 3 70B',
    description: 'Мощная модель общего назначения',
    maxTokens: 8192,
    category: 'text',
    developer: { name: 'Meta' },
    releaseStatus: 'main',
    tokensPerMinute: 6000,
  },
};

export const DEFAULT_MODEL = GroqModel._LLAMA3_70B;

export const getModelInfo = (modelId: GroqModel): ModelInfo => {
  const info = MODEL_INFO[modelId];
  if (!info) throw new Error(`Model ${modelId} not found`);
  return info;
};

export const isAudioModel = (modelId: GroqModel): boolean =>
  getModelInfo(modelId).category === 'audio';

export const isVisionModel = (modelId: GroqModel): boolean =>
  getModelInfo(modelId).category === 'vision';
