import React, { useState, useCallback, useMemo } from 'react';
import { GroqMarkdown } from './GroqMarkdown';
import { FiCopy, FiCheck, FiCode, FiEye, FiEyeOff, FiFilePlus } from 'react-icons/fi';
import '../styles.css';
import { toast } from 'react-toastify';
import { t, Locale } from '../localization';
import { Message } from '../types/types';
import type { App } from 'obsidian';

interface MessageItemProps {
  message: Message;
  className?: string;
  isCurrentUser?: boolean;
  isLastMessage?: boolean;
  onRenderComplete?: () => void;
  locale?: Locale;
}

// Функция для извлечения think-контента
const extractThinkContent = (content: string): { thinkContent: string; mainContent: string } => {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thinkContent = thinkMatch[1].trim();
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thinkContent, mainContent };
  }
  return { thinkContent: '', mainContent: content };
};

export const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({
    message,
    className: _className = '',
    isCurrentUser: _isCurrentUser = false,
    isLastMessage = false,
    onRenderComplete,
    locale = 'en',
  }) => {
    const [copyError, setCopyError] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [showThink, setShowThink] = useState(false);

    const content = useMemo(() => message.content || '', [message.content]);

    const isMaxTokensError = useMemo(() => {
      if (message.role !== 'assistant') return false;
      const normalized = content.toLowerCase();
      return (
        /error:\s*400/.test(normalized) &&
        normalized.includes(
          '"max_tokens must be less than or equal to 512, the maximum value for max_tokens is less than the context_window for this model"',
        )
      );
    }, [content, message.role]);

    // Извлекаем think-контент
    const { thinkContent, mainContent } = useMemo(() => extractThinkContent(content), [content]);

    const hasThinkContent = thinkContent.length > 0;

    const handleCopy = useCallback(async () => {
      setCopyError(false);
      try {
        // Копируем основной контент без think-тегов
        await navigator.clipboard.writeText(mainContent);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Error copying:', err);
        setCopyError(true);
        toast.error(t('copyError', locale));
        setTimeout(() => setCopyError(false), 2000);
      }
    }, [mainContent]);

    const toggleRawView = useCallback(() => {
      setShowRaw(prev => !prev);
    }, []);

    const toggleThinkView = useCallback(() => {
      setShowThink(prev => !prev);
    }, []);

    const handleCreateNote = useCallback(async () => {
      try {
        const app: App | undefined = window.app;
        if (!app?.vault) {
          throw new Error('App API is not available');
        }
        const noteContent = message.content ?? '';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `PolyMind ${timestamp}.md`;
        const file = await app.vault.create(fileName, noteContent);
        if (app.workspace?.getLeaf) {
          const leaf = app.workspace.getLeaf(false);
          if (leaf?.openFile) {
            await leaf.openFile(file);
          }
        }
        toast.success(t('noteCreated', locale));
      } catch (error) {
        console.error('Error creating note:', error);
        toast.error(t('noteCreateError', locale));
      }
    }, [locale, message.content]);

    const handleMarkdownRender = useCallback(() => {
      // Уведомляем только для последнего сообщения
      if (isLastMessage && onRenderComplete) {
        onRenderComplete();
      }
    }, [isLastMessage, onRenderComplete]);

    // Добавляем эффект пульсации для streaming сообщений
    const messageClassName = React.useMemo(() => {
      const classes = ['groq-message', `groq-message--${message.role}`];
      if (message.isStreaming) {
        classes.push('groq-message--streaming');
      }
      if (isMaxTokensError) {
        classes.push('groq-message--error', 'groq-message--error-maxtokens');
      }
      return classes.join(' ');
    }, [isMaxTokensError, message.role, message.isStreaming]);

    const contentClassName = React.useMemo(() => {
      const classes = ['groq-message__content'];
      if (showRaw) {
        classes.push('groq-message__content--raw');
      }
      if (isMaxTokensError) {
        classes.push('groq-message__content--error');
      }
      return classes.join(' ');
    }, [isMaxTokensError, showRaw]);

    return (
      <div
        className={messageClassName}
        data-error-label={isMaxTokensError ? t('errorLabel', locale) : undefined}
      >
        <div className="groq-message__header">
          <div className="groq-message__meta">
            <span className="groq-message__role">
              {message.role === 'user' ? t('you', locale) : t('assistant', locale)}
            </span>
            <span className="groq-message__timestamp">
              {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {hasThinkContent && (
              <span className="groq-message__think-badge">{t('hasThinking', locale)}</span>
            )}
          </div>
          {message.role === 'assistant' && (
            <div className="groq-message__actions">
              <button
                onClick={() => void handleCreateNote()}
                className="groq-icon-button"
                aria-label={t('createNote', locale)}
                title={t('createNote', locale)}
              >
                <FiFilePlus size={14} />
              </button>
              {/* Кнопка показа think-контента */}
              {hasThinkContent && (
                <button
                  onClick={toggleThinkView}
                  className="groq-icon-button"
                  aria-label={showThink ? t('hideThinking', locale) : t('showThinking', locale)}
                >
                  {showThink ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              )}
              {/* Кнопка raw view */}
              <button
                onClick={toggleRawView}
                className="groq-icon-button"
                aria-label={showRaw ? t('showFormatted', locale) : t('showRaw', locale)}
              >
                <FiCode size={14} />
              </button>
              {/* Кнопка копирования */}
              <button
                onClick={() => void handleCopy()}
                className="groq-icon-button"
                aria-label={t('copyMessage', locale)}
              >
                {copyError ? (
                  <span className="groq-message__copy-error">!</span>
                ) : isCopied ? (
                  <FiCheck size={14} color="var(--text-success)" />
                ) : (
                  <FiCopy size={14} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Think-контент (раскрываемая секция) */}
        {hasThinkContent && showThink && (
          <div className="groq-think-content">
            <div className="groq-think-content__header">
              <span className="groq-think-content__title">{t('thinkingProcess', locale)}</span>
            </div>
            <div className="groq-think-content__body">
              {showRaw ? (
                <pre className="groq-think-raw">
                  <code>{thinkContent}</code>
                </pre>
              ) : (
                <GroqMarkdown
                  content={thinkContent}
                  onRenderComplete={isLastMessage ? handleMarkdownRender : undefined}
                  app={window.app || undefined}
                  locale={locale}
                />
              )}
            </div>
          </div>
        )}

        {/* Основной контент сообщения */}
        <div className={contentClassName}>
          {showRaw ? (
            <pre aria-label={t('rawContent', locale)}>
              <code>{mainContent}</code>
            </pre>
          ) : (
            <GroqMarkdown
              content={mainContent}
              onRenderComplete={isLastMessage ? handleMarkdownRender : undefined}
              app={window.app || undefined}
              locale={locale}
            />
          )}
        </div>
      </div>
    );
  },
);

MessageItem.displayName = 'MessageItem';
