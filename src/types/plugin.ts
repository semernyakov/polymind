import type { App, Plugin } from 'obsidian';
import type { GroqChatSettings } from './settings';

import type { AuthService } from '../services/authService';
import type { GroqService } from '../services/groqService';
import type { HistoryService } from '../services/historyService';

export interface GroqPluginInterface extends Plugin {
  readonly app: App;
  readonly settings: GroqChatSettings;
  readonly defaultSettings: Readonly<GroqChatSettings>;

  saveSettings(): Promise<void>;
  loadSettings(): Promise<void>;
  resetSettings(): Promise<void>;
  resetSettingsToDefault(): Promise<void>;

  changeDisplayMode(_mode: 'tab' | 'sidepanel'): Promise<void>;

  readonly groqService: GroqService;
  readonly historyService: HistoryService;
  readonly authService: AuthService;
}
