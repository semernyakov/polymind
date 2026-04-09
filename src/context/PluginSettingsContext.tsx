import React, { createContext, useContext, useState, useEffect } from 'react';
import { GroqChatSettings, DEFAULT_SETTINGS } from '../settings/GroqChatSettings';
import type { Plugin } from 'obsidian';
import type { Locale } from '../localization';

interface WindowWithLanguage {
  app?: {
    getLanguage?(): string;
  };
}

interface PluginSettingsContextType {
  settings: GroqChatSettings;
  updateSettings: (_newSettings: Partial<GroqChatSettings>) => void;
  locale: Locale;
}

export const PluginSettingsContext = createContext<PluginSettingsContextType | null>(null);

export const usePluginSettings = () => {
  const context = useContext(PluginSettingsContext);
  if (!context) {
    throw new Error('usePluginSettings must be used within a PluginSettingsProvider');
  }
  return context;
};

interface PluginSettingsProviderProps {
  children: React.ReactNode;
  _plugin: Plugin;
  initialSettings: GroqChatSettings;
}

export const PluginSettingsProvider: React.FC<PluginSettingsProviderProps> = ({
  children,
  _plugin,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<GroqChatSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [locale, setLocale] = useState<Locale>('en');

  // Get current locale from Obsidian app
  const getLanguage = (): Locale => {
    const app = (window as WindowWithLanguage).app;
    const appLang = app?.getLanguage?.();
    return (appLang && appLang.toLowerCase().startsWith('ru') ? 'ru' : 'en') as Locale;
  };

  const updateSettings = (newSettings: Partial<GroqChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  useEffect(() => {
    setLocale(getLanguage());
  }, []);

  return (
    <PluginSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        locale,
      }}
    >
      {children}
    </PluginSettingsContext.Provider>
  );
};
