import React, { useEffect, useRef } from 'react';
import { MarkdownRenderer, Component } from 'obsidian';
import type { App } from 'obsidian';
import { t, Locale } from '../localization';
import '../styles.css';

// Type for Obsidian container elements
interface ObsidianContainerElement extends HTMLElement {
  empty(): void;
  setText(_text: string): void;
}

// Type assertion helper for window.app
const getWindowApp = (): App | undefined => {
  return window.app;
};

interface GroqMarkdownProps {
  content: string;
  app?: App;
  onRenderComplete?: () => void;
  locale?: Locale;
}

export const GroqMarkdown: React.FC<GroqMarkdownProps> = ({
  content,
  app,
  onRenderComplete,
  locale = 'en',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mdComponentRef = useRef<Component | null>(null);
  const lastRenderedRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(false);
  const effectiveApp: App | undefined = app ?? getWindowApp();

  // Очистка think-тегов из контента для рендеринга
  const cleanedContent = React.useMemo(() => {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '');
  }, [content]);

  // Делегирование кликов по ссылкам
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!effectiveApp) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;

      const isInternal = anchor.classList.contains('internal-link');
      const href = anchor.getAttribute('href') || '';

      if (isInternal && href) {
        e.preventDefault();
        void effectiveApp.workspace.openLinkText(href, '/', false);
        return;
      }

      if (!isInternal) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    };

    container.addEventListener('click', onClick);
    return () => {
      container.removeEventListener('click', onClick);
    };
  }, [effectiveApp]);

  // Инициализируем Obsidian Component один раз
  useEffect(() => {
    mdComponentRef.current = new Component();
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (mdComponentRef.current) {
        mdComponentRef.current.unload();
        mdComponentRef.current = null;
      }
      if (containerRef.current) {
        (containerRef.current as ObsidianContainerElement).empty?.();
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // Рендер Markdown с дебаунсом
  useEffect(() => {
    if (!effectiveApp) {
      const container = containerRef.current;
      if (container) {
        (container as ObsidianContainerElement).empty?.();
        (container as ObsidianContainerElement).setText?.(cleanedContent);
      }
      lastRenderedRef.current = cleanedContent;
      if (onRenderComplete) {
        void onRenderComplete();
      }
      return;
    }
    if (lastRenderedRef.current === cleanedContent) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (!mountedRef.current) return;
        const container = containerRef.current;
        const mdComponent = mdComponentRef.current;
        if (!container || !mdComponent) {
          return;
        }

        (container as ObsidianContainerElement).empty?.();

        try {
          const sourcePath =
            effectiveApp.workspace.getActiveFile()?.path ?? effectiveApp.vault.getName() ?? '';

          await MarkdownRenderer.render(
            effectiveApp,
            cleanedContent,
            container,
            sourcePath,
            mdComponent,
          );

          // Гарантируем безопасность внешних ссылок
          container.querySelectorAll('a:not(.internal-link)').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          });

          // Обогащаем блоки кода
          enhanceCodeBlocks(container, locale);

          lastRenderedRef.current = cleanedContent;

          if (onRenderComplete) {
            void onRenderComplete();
          }
        } catch (err) {
          console.error('Error rendering markdown:', err);
          (container as ObsidianContainerElement).setText?.(cleanedContent);
          if (onRenderComplete) {
            void onRenderComplete();
          }
        }
      })();
    }, 50);
  }, [cleanedContent, effectiveApp, onRenderComplete]);

  // Функция enhanceCodeBlocks с локализацией
  const enhanceCodeBlocks = (root: HTMLElement, currentLocale: Locale) => {
    const codeBlocks = Array.from(root.querySelectorAll('pre > code'));
    codeBlocks.forEach(codeEl => {
      const preEl = codeEl.parentElement as HTMLPreElement | null;
      if (!preEl) return;

      const defaultCopyBtn = preEl.querySelector('button.copy-code-button');
      if (defaultCopyBtn && defaultCopyBtn.parentElement) {
        defaultCopyBtn.parentElement.removeChild(defaultCopyBtn);
      }
      const alreadyWrapped = preEl.parentElement?.classList.contains('groq-code-container');
      if (alreadyWrapped) return;

      const langClass = Array.from(codeEl.classList).find((c: string) => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'text';

      const wrapper = document.createElement('div');
      wrapper.className = 'groq-code-container';

      const header = document.createElement('div');
      header.className = 'groq-code-header';

      const langLabel = document.createElement('span');
      langLabel.className = 'groq-code-language';
      langLabel.textContent = lang.toUpperCase();

      const actions = document.createElement('div');

      const copyBtn = document.createElement('button');
      copyBtn.className = 'groq-icon-button groq-code-copy';
      copyBtn.type = 'button';
      copyBtn.setAttribute('aria-label', t('copyCode', currentLocale));

      // Create SVG element instead of using innerHTML
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'currentColor');
      path.setAttribute(
        'd',
        'M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
      );

      svg.appendChild(path);
      copyBtn.appendChild(svg);

      copyBtn.addEventListener('click', () => {
        void (async () => {
          try {
            await navigator.clipboard.writeText((codeEl as HTMLElement).innerText);
            copyBtn.classList.add('is-copied');
            setTimeout(() => copyBtn.classList.remove('is-copied'), 1200);
          } catch (e) {
            console.error('Copy failed', e);
          }
        })();
      });

      actions.appendChild(copyBtn);

      header.appendChild(langLabel);
      header.appendChild(actions);

      const parent = preEl.parentElement;
      if (!parent) return;
      parent.insertBefore(wrapper, preEl);
      wrapper.appendChild(header);
      wrapper.appendChild(preEl);
    });
  };

  return (
    <div className="groq-message__content-wrapper">
      <div
        ref={containerRef}
        className="groq-markdown-content markdown-rendered groq-markdown-content-wrapper"
      />
    </div>
  );
};

// Компонент-обертка для обратной совместимости (если app не передается)
interface GroqMarkdownLegacyProps {
  content: string;
}

export const GroqMarkdownLegacy: React.FC<GroqMarkdownLegacyProps> = ({ content }) => {
  return (
    <div className="groq-message__content-wrapper">
      <div
        className="groq-markdown-content markdown-preview groq-markdown-content-legacy"
        dangerouslySetInnerHTML={{ __html: simpleMarkdownRender(content) }}
      />
    </div>
  );
};

// Простой fallback-рендерер на случай недоступности Obsidian API
const simpleMarkdownRender = (text: string): string => {
  return text
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\*/g, '*')
    .replace(/\\_/g, '_')
    .replace(/\\`/g, '`')
    .replace(/\\>/g, '>')
    .replace(/\\|/g, '|')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
};

export default GroqMarkdown;
