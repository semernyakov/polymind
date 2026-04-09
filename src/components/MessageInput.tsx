import React, { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import { t, Locale } from '../localization';
import '../styles.css';

interface MessageInputProps {
  value: string;
  onChange: (_value: string) => void;
  onSend: () => void;
  _onKeyDown?: (_event: React.KeyboardEvent) => void;
  disabled?: boolean;
  maxTokens?: number;
  locale?: Locale;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  _onKeyDown,
  disabled = false,
  maxTokens,
  locale = 'en',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Auto-resize textarea using CSS classes
      textarea.classList.add('groq-textarea-auto');
      textarea.classList.toggle('groq-textarea-overflow', textarea.scrollHeight > 200);
    }
  }, [value]);

  const handleSendClick = () => {
    if (!disabled && value.trim()) {
      void onSend();
    }
  };

  const currentLength = value.length;
  const isOverLimit = !!(maxTokens && currentLength > maxTokens);
  const isSendDisabled = disabled || !value.trim() || isOverLimit;

  return (
    <div className="groq-chat-input">
      <div className="groq-chat-input__main">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
              e.preventDefault();
              void onSend();
            }
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={t('inputPlaceholder', locale)}
          disabled={disabled}
          rows={1}
          className="groq-chat-input__textarea groq-textarea-auto"
          aria-label={t('inputAriaLabel', locale)}
          aria-describedby="input-hint input-counter"
        />
        <button
          onClick={handleSendClick}
          disabled={isSendDisabled}
          className="groq-button groq-button--primary groq-chat-input__send-button"
          aria-label={t('sendMessage', locale)}
        >
          <FiSend className="groq-send-icon" />
        </button>
      </div>
      <div className="groq-chat-input__footer">
        <span id="input-hint" className="groq-message-input__hint">
          {t('inputHint', locale)
            .replace(/<kbd>/g, '')
            .replace(/<\/kbd>/g, '')
            .split('—')
            .map((part, i) => (i === 0 ? part + ' — ' : part))}
        </span>
        {maxTokens !== undefined && (
          <span
            id="input-counter"
            className={`groq-message-input__counter ${isOverLimit ? 'groq-message-input__counter--error' : ''}`}
          >
            {currentLength}/{maxTokens}
          </span>
        )}
      </div>
    </div>
  );
};
