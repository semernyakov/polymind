// src/localization.ts
export type Locale = 'ru' | 'en';

interface WindowWithLanguage {
  app?: {
    getLanguage?(): string;
  };
}

export const defaultLocale: Locale = 'en';

/**
 * Gets the current locale from Obsidian App API (requires minAppVersion >= 1.8.0)
 * Falls back to default locale if API is unavailable
 */
function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }
  const app = (window as WindowWithLanguage).app;
  const appLang = app?.getLanguage?.();
  if (typeof appLang === 'string') {
    const normalized = appLang.toLowerCase();
    return (normalized.startsWith('ru') ? 'ru' : 'en') as Locale;
  }
  return defaultLocale;
}

const translations: Record<Locale, Record<string, string>> = {
  ru: {
    // Settings
    'settings.interface': '👀 Интерфейс и язык',
    'settings.subtitle': 'Настройте PolyMind, чтобы общение с ИИ было максимально удобным! 😊',
    'settings.apiHeading': '🔑 Доступ к API',
    'settings.tailLimitName': 'Последние сообщения при открытии',
    'settings.tailLimitDesc': 'Сколько последних сообщений показывать без прокрутки',
    'settings.loadStepName': 'Шаг подгрузки истории',
    'settings.loadStepDesc':
      'Сколько сообщений добавлять при нажатии на кнопку или прокрутке вверх',
    'settings.noteContextHeading': '📄 Контекст заметок',
    'settings.openOnStartup': 'Открывать чат при запуске',
    'settings.openOnStartupDesc': 'Автоматически открывать панель чата при запуске Obsidian.',
    'settings.expandWikilinks': 'Раскрывать [[ссылки]] в сообщении',
    'settings.expandWikilinksDesc':
      'Заменять [[Заметка]] на реальное содержимое заметки перед отправкой.',
    'settings.includeOpenNotes': 'Включать все открытые заметки как контекст',
    'settings.includeOpenNotesDesc':
      'Автоматически добавлять содержимое всех открытых вкладок к каждому сообщению.',
    'settings.maxContextChars': 'Макс. символов на заметку',
    'settings.maxContextCharsDesc': '0 = включать заметку целиком.',
    'settings.historyHeading': '🕓 История чата',
    'settings.default10': 'По умолчанию: 10',
    'settings.default20': 'По умолчанию: 20',
    'settings.example10': 'Например: 10',
    'settings.modelSelection': '🤖 Выбор модели',
    'settings.saveAll': '✅ Сохранить все настройки',
    'settings.settingsSaved': 'Настройки сохранены',
    'settings.resetToDefault': '♻️ Сбросить настройки по умолчанию',
    'settings.settingsReset': 'Настройки сброшены',
    'settings.resetNotImplemented': 'Метод сброса не реализован',
    'settings.tokenGetPrefix': 'Получить токен Groq можно на ',
    'settings.tokenOfficialSiteText': 'официальном сайте Groq API',
    'settings.selectModelPlaceholder': 'Выберите модель',
    modelDesc: 'Выберите модель, которую плагин будет использовать для ответа',
    supportDialogTitle: 'Поддержать разработку',
    supportDialogClose: 'Закрыть',
    supportDialogContent:
      'Этот плагин разрабатывается энтузиастом в свободное время. Ваша поддержка поможет ускорить разработку, добавить новые функции и поддерживать проект в актуальном состоянии.',
    supportDialogYooMoneyInfo:
      'Вы можете поддержать проект через YooMoney. Сервис принимает переводы как из России, так и из других стран (через банковские карты).',
    supportDialogThanksTitle: 'Спасибо за использование PolyMind!',
    supportDialogThanksSupport: 'Поддержать проект',
    supportDialogThanksReview: 'Оставить отзыв',
    supportDialogThanksContact: 'Написать разработчику в Telegram',
    supportDialogGoToSupport: 'Перейти к поддержке',
    language: 'Язык',
    save: 'Сохранить',
    cancel: 'Сбросить',
    chatTitle: 'PolyMind',
    authToken: 'Токен авторизации',
    // Thanks block
    'thanks.title': 'Спасибо за использование плагина!',
    apiKey: 'API ключ',
    apiKeyPlaceholder: 'Введите API ключ',
    checkApiKey: 'Проверить',
    validApiKey: '✅ Ключ действителен',
    invalidApiKey: '❌ Неверный API ключ!',
    model: 'Модель',
    active: 'Активна',
    requestsLeft: 'Осталось запросов',
    tokensLeft: 'Осталось токенов',
    reset: 'Сброс',
    status: 'Статус',
    temperature: 'Температура',
    maxTokens: 'Макс. токенов',
    maxTokensPlaceholder: 'Введите число',
    history: 'Хранение истории',
    historyLengthPlaceholder: '20',
    historyFile: 'Файл истории',
    historyFilePlaceholder: 'groq-chat-history.md',
    displayMode: 'Режим отображения',
    tab: 'Во вкладке',
    sidepanel: 'В боковой панели',
    // Tooltips & Dialogs
    supportDev: 'Поддержать разработку',
    supportDevShort: 'Поддержать',
    supportDevHeader: 'Поддержать разработчика',
    modelInfo: 'Информация о модели',
    description: 'Описание',
    developer: 'Разработчик',
    releaseDate: 'Дата выпуска',
    actualDate: 'Дата актуальности',
    releaseStatus: 'Статус релиза',
    releaseStatusMain: 'Основная',
    releaseStatusPreview: 'Предварительная',
    you: 'Вы',
    assistant: 'Ассистент',
    copyError: 'Ошибка при копировании',
    close: 'Закрыть',
    modelUnavailable: 'Эта модель временно недоступна',
    showInSidepanel: 'Показать в боковой панели',
    showInTab: 'Показать во вкладке',
    scrollToTop: 'К началу диалога',
    scrollToBottom: 'К концу диалога',
    clearHistory: 'Очистить историю',
    showFormatting: 'Показать форматирование',
    showFormatted: 'Показать форматированный текст',
    showRaw: 'Показать исходный код',
    copyRawCode: 'Копировать исходный код',
    copyMessage: 'Копировать сообщение',
    rawContent: 'Исходное содержимое сообщения',
    chooseModel: 'Выберите модель Groq',
    copyCode: 'Копировать код',
    refreshModels: 'Обновить модели',
    modelsUpdated: 'Список моделей обновлён',
    modelsUpdateError: 'Ошибка при обновлении списка моделей',
    showRawCode: 'Показать исходный код',
    hideRawCode: 'Скрыть исходный код',
    createNote: 'Создать заметку',
    noteCreated: 'Заметка создана',
    noteCreateError: 'Не удалось создать заметку',
    noModelsFound: 'Нет доступных моделей',
    loadingModels: 'Загрузка моделей...',
    imageNotice:
      '⚠️ Чат не поддерживает отображение изображений. Если модель возвращает абсолютную ссылку на изображение, будет показана только ссылка.',
    hasThinking: 'Есть размышления',
    showThinking: 'Показать ход мыслей',
    hideThinking: 'Скрыть ход мыслей',
    thinkingProcess: 'Ход мыслей модели',
    thinkContent: 'Рассуждения модели',
    // MessageList
    showPreviousN: 'Показать предыдущие {{n}}',
    newMessages: 'Новые сообщения',
    // Input (MessageInput)
    inputPlaceholder: 'Введите сообщение...',
    inputAriaLabel: 'Поле ввода сообщения',
    sendMessage: 'Отправить сообщение',
    sendTitle: 'Отправить (Ctrl+Enter)',
    inputHint:
      '<kbd>Ctrl</kbd>+<kbd>Enter</kbd> — отправить, <kbd>Shift</kbd>+<kbd>Enter</kbd> — новая строка',
    inputCounterTitle:
      'Текущее кол-во символов / Макс. кол-во токенов для модели (приблизительное сравнение)',
    symbolsTokens: 'символы/токены',
    modelIsThinking: 'Модель думает',
    generatingResponse: 'Формирую ответ',
    supportButton: '💰 Поддержать',
    supportNote:
      'Вы можете поддержать проект через YooMoney. Сервис принимает переводы как из России, так и из других стран (через банковские карты).',
    // Error messages
    apiError: 'API ошибка',
    unknownError: 'Неизвестная ошибка',
    emptyMessage: 'Сообщение не может быть пустым',
    modelNotAvailable: 'Модель "{{model}}" не доступна',
    rateLimitExceeded: 'Превышен лимит запросов или токенов. Попробуйте позже.',
    rateLimitsExhausted: 'Лимиты запросов исчерпаны',
    serverError: 'Ошибка сервера. Пожалуйста, попробуйте позже.',
    networkError: 'Ошибка сети. Проверьте подключение к интернету.',
    errorLabel: 'Ошибка',
    preview: 'предварительная',
  },
  en: {
    // Settings
    'settings.interface': '👀 Interface & Language',
    'settings.subtitle': 'Make your AI chat experience as friendly and delightful as possible! 😊',
    'settings.apiHeading': '🔑 API Access',
    'settings.tailLimitName': 'Last messages at startup',
    'settings.tailLimitDesc': 'How many last messages to show without initial scrolling',
    'settings.loadStepName': 'History load step',
    'settings.loadStepDesc': 'How many messages to load when clicking the button or scrolling up',
    'settings.historyHeading': '🕓 Chat History',
    'settings.default10': 'Default: 10',
    'settings.default20': 'Default: 20',
    'settings.example10': 'e.g. 10',
    'settings.modelSelection': '🤖 Model Selection',
    'settings.saveAll': '✅ Save all Settings',
    'settings.settingsSaved': 'Settings saved',
    'settings.resetToDefault': '♻️ Reset to Default',
    'settings.settingsReset': 'Settings reset',
    'settings.resetNotImplemented': 'Reset method not implemented',
    'settings.tokenGetPrefix': 'You can get your Groq token at the ',
    'settings.tokenOfficialSiteText': 'official Groq API website',
    'settings.selectModelPlaceholder': 'Select a model',
    modelDesc: 'Choose the model the plugin will use to respond',
    supportDialogTitle: 'Support development',
    supportDialogClose: 'Close',
    supportDialogContent:
      'This plugin is developed by an enthusiast in their free time. Your support will help accelerate development, add new features, and maintain the project in an up-to-date state.',
    supportDialogYooMoneyInfo:
      'You can support the project via YooMoney. The service accepts transfers from both Russia and other Countries (via bank cards).',
    supportDialogThanksTitle: 'Thank you for using PolyMind!',
    supportDialogThanksSupport: 'Support project',
    supportDialogThanksReview: 'Leave review',
    supportDialogThanksContact: 'Contact with developer by Telegram',
    supportDialogGoToSupport: 'Go to support',
    language: 'Language',
    save: 'Save',
    cancel: 'Reset',
    chatTitle: 'PolyMind',
    authToken: 'Auth Token',
    // Thanks block
    'thanks.title': 'Thank you for using the plugin!',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter API key',
    checkApiKey: 'Check',
    validApiKey: '✔️ Key is valid',
    invalidApiKey: '❌ Invalid key. Please check your Settings!',
    model: 'Model',
    active: 'Active',
    requestsLeft: 'Requests left',
    tokensLeft: 'Tokens left',
    reset: 'Reset',
    status: 'Status',
    temperature: 'Temperature',
    maxTokens: 'Max tokens',
    maxTokensPlaceholder: 'Enter a number',
    history: 'History storage',
    historyLengthPlaceholder: '20',
    historyFile: 'History file',
    historyFilePlaceholder: 'groq-chat-history.md',
    displayMode: 'Display mode',
    tab: 'In tab',
    sidepanel: 'In side panel',
    // Tooltips & Dialogs
    supportDev: 'Support development',
    supportDevShort: 'Support',
    supportDevHeader: 'Support developer',
    modelInfo: 'Model info',
    description: 'Description',
    developer: 'Developer',
    releaseDate: 'Release Date',
    actualDate: 'As of Date',
    releaseStatus: 'Release Status',
    releaseStatusMain: 'Main',
    releaseStatusPreview: 'Preview',
    you: 'You',
    assistant: 'Assistant',
    copyError: 'Error copying to clipboard',
    close: 'Close',
    modelUnavailable: 'This model is temporarily unavailable',
    showInSidepanel: 'Show in Sidepanel',
    showInTab: 'Show in Tab',
    scrollToTop: 'Scroll to top',
    scrollToBottom: 'Scroll to bottom',
    clearHistory: 'Clear history',
    showFormatting: 'Show formatting',
    showFormatted: 'Show formatted text',
    showRaw: 'Show raw',
    copyRawCode: 'Copy raw code',
    copyMessage: 'Copy message',
    rawContent: 'Raw message content',
    chooseModel: 'Choose Groq model',
    copyCode: 'Copy code',
    refreshModels: 'Refresh models',
    modelsUpdated: 'Model list updated',
    modelsUpdateError: 'Error updating model list',
    showRawCode: 'Show raw code',
    hideRawCode: 'Hide raw code',
    createNote: 'Create note',
    noteCreated: 'Note created',
    noteCreateError: 'Failed to create note',
    noModelsFound: 'No available models',
    loadingModels: 'Loading models...',
    imageNotice:
      '⚠️ Chat does not support image rendering. If the model returns an absolute image link, only the link will be shown.',
    hasThinking: 'Has thinking',
    showThinking: 'Show thinking process',
    hideThinking: 'Hide thinking process',
    thinkingProcess: 'Thinking Process',
    thinkContent: 'Model reasoning',
    // MessageList
    showPreviousN: 'Show previous {{n}}',
    newMessages: 'New messages',
    // Input (MessageInput)
    inputPlaceholder: 'Type a message...',
    inputAriaLabel: 'Message input field',
    sendMessage: 'Send message',
    sendTitle: 'Send (Ctrl+Enter)',
    inputHint:
      '<kbd>Ctrl</kbd>+<kbd>Enter</kbd> — send, <kbd>Shift</kbd>+<kbd>Enter</kbd> — new line',
    inputCounterTitle: 'Current character count / Max model tokens (approximate)',
    symbolsTokens: 'chars/tokens',
    modelIsThinking: 'Model is thinking',
    generatingResponse: 'Generating response',
    supportButton: '💰 Support',
    supportNote:
      'You can support the project via YooMoney. The service accepts transfers from both Russia and other Countries (via bank cards).',
    // Error messages
    apiError: 'API error',
    unknownError: 'Unknown error',
    emptyMessage: 'Message cannot be empty',
    modelNotAvailable: 'Model "{{model}}" is not available',
    rateLimitExceeded: 'Rate limit exceeded. Please try again later.',
    rateLimitsExhausted: 'Request limits exhausted',
    serverError: 'Server error. Please try again later.',
    networkError: 'Network error. Please check your internet connection.',
    errorLabel: 'Error',
    preview: 'preview',
  },
};

/**
 * Translates a key to the current or specified locale
 * @param key - The translation key
 * @param locale - Optional locale to use (defaults to current locale)
 * @returns The translated string or the key if translation not found
 */
export function t(key: string, locale: Locale = getCurrentLocale()): string {
  return translations[locale]?.[key] || translations[defaultLocale]?.[key] || key;
}

/**
 * Translates a key containing HTML to the current or specified locale
 * @param key - The translation key
 * @param locale - Optional locale to use (defaults to current locale)
 * @returns An object with __html property containing the translated HTML string
 */
export function tHtml(key: string, locale?: Locale): { __html: string } {
  const loc = locale ?? getCurrentLocale();
  const translation = translations[loc]?.[key] || translations[defaultLocale]?.[key] || key;
  return { __html: translation };
}
