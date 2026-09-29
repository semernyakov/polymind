import type { GroqModelInfo } from '../settings/GroqChatSettings';

/**
 * Курируемый список топовых моделей OpenRouter (OpenAI-совместимые id).
 * Активны и рабочи через OpenRouter при наличии ключа. Полный список
 * догружается кнопкой в настройках через mergeOpenRouterModels.
 */
export const openRouterModels: GroqModelInfo[] = [
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'Anthropic' },
    owned_by: 'anthropic',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'Anthropic' },
    owned_by: 'anthropic',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'Google' },
    owned_by: 'google',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'Google' },
    owned_by: 'google',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'OpenAI' },
    owned_by: 'openai',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'OpenAI' },
    owned_by: 'openai',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'Meta' },
    owned_by: 'meta-llama',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'openrouter',
    isActive: true,
    developer: { name: 'DeepSeek' },
    owned_by: 'deepseek',
  },
];

export function mergeOpenRouterModels(
  curated: GroqModelInfo[],
  apiModels: GroqModelInfo[],
): GroqModelInfo[] {
  const seen = new Set(curated.map(m => m.id));
  const extra = apiModels.filter(m => !seen.has(m.id));
  return [...curated, ...extra];
}
