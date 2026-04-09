import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GroqPluginInterface } from '../types/plugin';
import { Message } from '../types/types';
import { MessageUtils } from '../utils/messageUtils';
import { MessageList, MessageListHandles } from './MessageList';
import { ModelSelector } from './ModelSelector';
import { MessageInput } from './MessageInput';
import { SupportDialog } from './SupportDialog';
import {
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiDollarSign,
  FiSidebar,
  FiSquare,
  FiInfo,
} from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles.css';
import { ModelInfoDialog } from './ModelInfoDialog';
import { PluginSettingsProvider } from '../context/PluginSettingsContext';
import { t, Locale } from '../localization';
import { GroqModel, ModelCategory, ModelReleaseStatus } from '../types/types';
import { fixModelNameCasing } from '../utils/modelUtils';
import { HistoryService } from '../services/historyService';
import { RateLimitsType } from '../services/groqService';
import { GroqModelInfo } from '../settings/GroqChatSettings';

interface ChatPanelProps {
  plugin: GroqPluginInterface;
  displayMode: 'tab' | 'sidepanel';
  initialMessages?: Message[];
  onDisplayModeChange: (_mode: 'tab' | 'sidepanel') => void;
}

interface LocalDynamicModelInfo {
  id: string;
  name: string;
  description?: string;
  category?: string;
  developer?: { name: string; url?: string };
  releaseStatus?: string;
  maxTokens?: number;
  tokensPerMinute?: number;
  requestsPerMinute?: number;
  maxDuration?: number;
  maxFileSize?: number;
}

interface ModelInfo {
  id: GroqModel;
  name: string;
  description: string;
  category: ModelCategory;
  developer: { name: string; url?: string };
  releaseStatus: ModelReleaseStatus;
  maxTokens: number;
  tokensPerMinute?: number;
  maxDuration?: number;
  maxFileSize?: number;
}

// Хук для управления сообщениями
const useMessages = (
  initialMessages: Message[],
  historyService: HistoryService,
  locale: Locale,
) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  useEffect(() => {
    if (initialMessages.length > 0) {
      if (JSON.stringify(messages) !== JSON.stringify(initialMessages)) {
        setMessages(initialMessages);
      }
      setHasLoadedHistory(true);
      setIsHistoryLoading(false);
    } else if (!hasLoadedHistory) {
      const loadHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const history = await historyService.getHistory();
          setMessages(history);
          setHasLoadedHistory(true);
        } catch {
          // no-op
        } finally {
          setIsHistoryLoading(false);
        }
      };
      void loadHistory();
    }
  }, [historyService, hasLoadedHistory, initialMessages]);

  const clearHistory = async () => {
    try {
      await historyService.clearHistory();
      setMessages([]);
      setHasLoadedHistory(true);
      toast.success(t('historyCleared', locale));
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error(t('historyClearError', locale));
    }
  };

  return { messages, setMessages, isHistoryLoading, clearHistory };
};

export const ChatPanel: React.FC<ChatPanelProps> = props => {
  const ChatPanelInner: React.FC = () => {
    const { plugin, displayMode, initialMessages = [], onDisplayModeChange } = props;
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    // Только активные модели
    const initialModels: LocalDynamicModelInfo[] = (plugin.settings.groqAvailableModels || [])
      .filter((m: GroqModelInfo) => m.isActive !== false)
      .map((m: GroqModelInfo) => ({ ...m }));
    const [availableModels, setAvailableModels] = useState<LocalDynamicModelInfo[]>(initialModels);

    // Выбираем модель из настроек, если она валидна, иначе первую активную
    const getInitialModel = () => {
      const modelFromSettings = plugin.settings.model;
      if (modelFromSettings && initialModels.find(m => m.id === modelFromSettings)) {
        return modelFromSettings;
      }
      return initialModels[0]?.id || GroqModel.LLAMA3_70B;
    };
    const [selectedModel, setSelectedModel] = useState<string>(getInitialModel());

    // При смене модели — сразу скроллим в самый низ (новые требования)
    useEffect(() => {
      messageListRef.current?.scrollToBottom({ smooth: false });
    }, [selectedModel]);

    // Если выбранная модель исчезла из списка, сбрасываем на первую доступную
    useEffect(() => {
      if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModel)) {
        setSelectedModel(availableModels[0].id);
      }
    }, [availableModels]);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
    const [rateLimits, setRateLimits] = useState<RateLimitsType | null>(null);
    const messageListRef = useRef<MessageListHandles>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Мониторинг изменения языка Obsidian
    const getObsidianLocale = useCallback((): Locale => {
      const appLang = (plugin.app as unknown as { getLanguage?: () => string })?.getLanguage?.();
      if (typeof appLang === 'string') {
        const val = appLang.toLowerCase();
        return (val.startsWith('ru') ? 'ru' : 'en') as Locale;
      }
      const htmlLang = document?.documentElement?.getAttribute('lang');
      if (typeof htmlLang === 'string') {
        const val = htmlLang.toLowerCase();
        return (val.startsWith('ru') ? 'ru' : 'en') as Locale;
      }
      return 'en';
    }, [plugin.app]);

    const [locale, setLocale] = useState<Locale>(getObsidianLocale);

    // Монитор изменения языка
    useEffect(() => {
      const checkLanguageChange = () => {
        const currentLocale = getObsidianLocale();
        if (currentLocale !== locale) {
          setLocale(currentLocale);
        }
      };

      // Проверяем каждую секунду
      const intervalId = window.setInterval(checkLanguageChange, 1000);

      return () => {
        window.clearInterval(intervalId);
      };
    }, [locale, getObsidianLocale]);

    const { messages, setMessages, isHistoryLoading, clearHistory } = useMessages(
      initialMessages,
      plugin.historyService,
      locale,
    );

    // Динамическая тема
    useEffect(() => {
      const updateTheme = () => {
        const root = document.documentElement;
        const obsidianTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        root.setAttribute('data-groq-theme', obsidianTheme);
      };
      updateTheme();
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }, []);

    const fetchAvailableModels = useCallback(async (): Promise<LocalDynamicModelInfo[]> => {
      if (!plugin.groqService.getAvailableModelsWithLimits) return [];
      const { models, rateLimits } = await plugin.groqService.getAvailableModelsWithLimits();
      setRateLimits(rateLimits || {});
      const filtered = models.filter((m: GroqModelInfo) => m.isActive !== false);
      setAvailableModels(filtered.map((m: GroqModelInfo) => ({ ...m })));
      return filtered;
    }, [plugin.groqService]);

    useEffect(() => {
      void fetchAvailableModels();
    }, [fetchAvailableModels]);

    // ResizeObserver
    useEffect(() => {
      const handleResize = () => {
        messageListRef.current?.forceUpdate();
      };
      const resizeObserver = new ResizeObserver(handleResize);
      const currentContainer = containerRef.current;
      if (currentContainer) {
        resizeObserver.observe(currentContainer);
      }
      return () => {
        if (currentContainer) {
          resizeObserver.unobserve(currentContainer);
        }
        resizeObserver.disconnect();
      };
    }, []);

    const handleScrollToTop = useCallback(() => {
      messageListRef.current?.scrollToTop();
    }, []);

    const handleScrollToBottom = useCallback(() => {
      messageListRef.current?.scrollToBottom();
    }, []);

    const handleSendMessage = useCallback(async () => {
      const trimmedValue = inputValue.trim();
      if (!trimmedValue || isLoading) return;

      const userMessage = MessageUtils.create('user', trimmedValue);
      setInputValue('');
      setIsLoading(true);

      try {
        await plugin.historyService.addMessage(userMessage);

        // Создаем временное сообщение ассистента для стриминга
        const tempAssistantMessage: Message = {
          id: 'temp-' + Date.now().toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };

        setMessages(prev => [...prev, userMessage, tempAssistantMessage]);
        setIsStreaming(true);
        // Устанавливаем флаг блокировки скролла во время стриминга
        // Скролл будет выполнен автоматически через onRenderComplete после рендеринга markdown

        // Handler for streaming chunks - immediate scroll to keep content visible
        let streamContent = '';
        const handleChunk = (chunk: string) => {
          streamContent += chunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempAssistantMessage.id ? { ...msg, content: streamContent } : msg,
            ),
          );
          // Immediate scroll to bottom during streaming without smooth animation
          messageListRef.current?.scrollToBottom({ smooth: false });
        };

        const assistantMessage = await plugin.groqService.sendMessage(
          trimmedValue,
          selectedModel,
          handleChunk,
        );

        // Replace temporary message with final message
        setMessages(prev =>
          prev.map(msg => (msg.id === tempAssistantMessage.id ? assistantMessage : msg)),
        );
        setIsStreaming(false);
        // Final immediate scroll to ensure complete message is visible
        messageListRef.current?.scrollToBottom({ smooth: false });

        await plugin.historyService.addMessage(assistantMessage);
      } catch (error: unknown) {
        console.error('Error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast.error(`${t('error', locale)}: ${errorMsg}`);
        const errorMessage = MessageUtils.create('assistant', `${t('error', locale)}: ${errorMsg}`);
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }, [inputValue, isLoading, plugin, selectedModel]);

    const handleModelChange = (modelId: string) => {
      setSelectedModel(modelId);
      plugin.settings.model = modelId;
      void plugin.saveSettings();
    };

    const toggleDisplayMode = () => {
      const newMode = displayMode === 'tab' ? 'sidepanel' : 'tab';
      onDisplayModeChange(newMode);
    };

    const toModelInfo = (model: LocalDynamicModelInfo): ModelInfo => ({
      id: (Object.values(GroqModel).includes(model.id as GroqModel)
        ? model.id
        : GroqModel.LLAMA3_70B) as GroqModel,
      name: fixModelNameCasing(model.name),
      description: model.description || '',
      category: (model.category as ModelCategory) || 'text',
      developer: model.developer || { name: '' },
      releaseStatus: (model.releaseStatus as ModelReleaseStatus) || 'main',
      maxTokens: model.maxTokens || 4096,
      tokensPerMinute: model.tokensPerMinute,
      maxDuration: model.maxDuration,
      maxFileSize: model.maxFileSize,
    });

    const selectedModelInfo = toModelInfo(
      availableModels.find(m => m.id === selectedModel) ||
        availableModels[0] || { id: '', name: '', description: '' },
    );

    React.useEffect(() => {
      // console.log('[DEBUG] selectedModel:', selectedModel);
      // console.log('[DEBUG] availableModels:', availableModels);
      // console.log('[DEBUG] selectedModelInfo:', selectedModelInfo);
    }, [selectedModel, availableModels, selectedModelInfo]);

    if (!plugin.settings.apiKey) {
      return (
        <div className="groq-api-key-warning">
          {t('apiKeyMissing', locale) || 'API key is missing'}
        </div>
      );
    }

    return (
      <div className={`groq-container groq-chat groq-chat--${displayMode}`} ref={containerRef}>
        <div className="groq-chat__header">
          <div className="groq-chat__header-left">
            <ModelSelector
              plugin={plugin}
              selectedModel={selectedModel}
              onSelectModel={handleModelChange}
              getAvailableModels={fetchAvailableModels}
              availableModels={availableModels}
              locale={locale}
            />
          </div>
          <div className="groq-chat__header-right">
            <button
              onClick={() => setIsModelInfoOpen(true)}
              className="groq-icon-button groq-model-info-button"
              aria-label={t('modelInfo', locale)}
            >
              <FiInfo size={16} />
            </button>
            {/* ModelInfoDialog has been moved to the bottom of the component */}
            <button
              onClick={toggleDisplayMode}
              className="groq-icon-button groq-display-mode-button"
              aria-label={
                displayMode === 'tab' ? t('showInSidepanel', locale) : t('showInTab', locale)
              }
            >
              {displayMode === 'tab' ? <FiSidebar size={16} /> : <FiSquare size={16} />}
            </button>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="groq-icon-button groq-support-header-button"
              aria-label={t('supportDevHeader', locale)}
            >
              <FiDollarSign size={16} />
            </button>
            <button
              onClick={handleScrollToTop}
              className="groq-icon-button groq-scroll-button"
              aria-label={t('scrollToTop', locale)}
              disabled={messages.length === 0}
            >
              <FiChevronUp size={16} />
            </button>
            <button
              onClick={handleScrollToBottom}
              className="groq-icon-button groq-scroll-button"
              aria-label={t('scrollToBottom', locale)}
              disabled={messages.length === 0}
            >
              <FiChevronDown size={16} />
            </button>
            <button
              onClick={() => void clearHistory()}
              className="groq-icon-button groq-clear-button"
              aria-label={t('clearHistory', locale)}
              disabled={messages.length === 0 || isLoading}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>

        <div className="groq-chat__content">
          <div className="groq-chat__messages-container">
            {rateLimits && (rateLimits.requestsPerDay || rateLimits.tokensPerMinute) && (
              <section className="groq-rate-limits">
                <b>{t('rateLimits', locale)}:</b>
                {rateLimits.requestsPerDay !== undefined && (
                  <div>
                    {t('requestsPerDay', locale)}:{' '}
                    <b>
                      {rateLimits.remainingRequests ?? '—'} / {rateLimits.requestsPerDay}
                    </b>
                    {rateLimits.resetRequests && (
                      <span>
                        ({t('reset', locale)}: {rateLimits.resetRequests})
                      </span>
                    )}
                  </div>
                )}
                {rateLimits.tokensPerMinute !== undefined && (
                  <div>
                    {t('tokensPerMinute', locale)}:{' '}
                    <b>
                      {rateLimits.remainingTokens ?? '—'} / {rateLimits.tokensPerMinute}
                    </b>
                    {rateLimits.resetTokens && (
                      <span>
                        ({t('reset', locale)}: {rateLimits.resetTokens})
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}
            <MessageList
              ref={messageListRef}
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              language={locale}
              tailLimit={plugin.settings.messageTailLimit ?? 10}
              tailStep={plugin.settings.messageLoadStep ?? 20}
            />
            {isHistoryLoading && (
              <div className="groq-chat__loading-history">
                <div className="groq-spinner"></div>
                <span>{t('loadingHistory', locale)}</span>
              </div>
            )}
          </div>

          <div className="groq-chat__input-container">
            <MessageInput
              value={inputValue}
              onChange={value => void setInputValue(value)}
              onSend={() => void handleSendMessage()}
              disabled={isLoading || isHistoryLoading}
              maxTokens={selectedModelInfo.maxTokens}
              locale={locale}
            />
          </div>
        </div>

        <SupportDialog
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
          locale={locale}
        />
        <ModelInfoDialog
          key={`${selectedModel}-${isModelInfoOpen}`}
          isOpen={isModelInfoOpen}
          onClose={() => setIsModelInfoOpen(false)}
          modelInfo={selectedModelInfo}
          isAvailable={availableModels.some(m => m.id === selectedModel)}
          locale={locale}
        />

        <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
      </div>
    );
  };

  return (
    <PluginSettingsProvider _plugin={props.plugin} initialSettings={props.plugin.settings}>
      <ChatPanelInner />
    </PluginSettingsProvider>
  );
};
