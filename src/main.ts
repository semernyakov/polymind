import './hot-reload';
import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { GroqChatView, VIEW_TYPE_GROQ_CHAT } from './views/GroqChatView';
import { DEFAULT_SETTINGS, GroqChatSettings } from './settings/GroqChatSettings';
import { AuthService } from './services/authService';
import { GroqService } from './services/groqService';
import { HistoryService } from './services/historyService';
import { GroqChatSettingsTab } from './settings/GroqChatSettingsTab';
import { GroqPluginInterface } from './types/plugin';
import './styles.css';

export default class GroqChatPlugin extends Plugin implements GroqPluginInterface {
  settings: GroqChatSettings = { ...DEFAULT_SETTINGS };
  defaultSettings: Readonly<GroqChatSettings> = { ...DEFAULT_SETTINGS };
  authService!: AuthService;
  groqService!: GroqService;
  historyService!: HistoryService;
  private currentLeaf: WorkspaceLeaf | null = null;
  private settingsTab: GroqChatSettingsTab | null = null;

  async onload() {
    try {
      new Notice('Polymind is loading…');

      await this.loadSettings();
      this.initializeServices();

      // Check API key on plugin load
      if (this.settings.apiKey) {
        const isValid = await this.groqService.validateApiKey(this.settings.apiKey);
        if (!isValid) {
          new Notice('Invalid API key. Please update your API key in settings.');
        }
      } else {
        new Notice('Please set your Groq API key in settings.');
      }

      this.registerView(VIEW_TYPE_GROQ_CHAT, leaf => {
        this.currentLeaf = leaf;
        return new GroqChatView(leaf, this);
      });

      this.addCommands();
      this.addRibbonIcon('message-square', 'Polymind', () => this.activateView());
      this.settingsTab = new GroqChatSettingsTab(this.app, this);
      this.addSettingTab(this.settingsTab);

      new Notice('Polymind is ready to work');

      // Автоматически открываем интерфейс после полной инициализации workspace
      this.app.workspace.onLayoutReady(() => {
        void this.activateView().catch(error => {
          console.error('Failed to activate Polymind view:', error);
          new Notice('Polymind failed to open interface');
        });
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      new Notice(`Polymind: Loading error — ${errorMessage}`);
      console.error('Polymind plugin loading error:', e);
    }
  }

  private initializeServices(): void {
    this.groqService = new GroqService(this);
    this.authService = new AuthService(this.groqService, this);
    this.historyService = new HistoryService(this);
  }

  private addCommands(): void {
    this.addCommand({
      id: 'open-groq-chat-tab',
      name: 'Open in tab',
      callback: () => this.changeDisplayMode('tab'),
    });

    this.addCommand({
      id: 'open-groq-chat-sidepanel',
      name: 'Open in sidepanel',
      callback: () => this.changeDisplayMode('sidepanel'),
    });
  }

  async activateView() {
    try {
      await this.changeDisplayMode(this.settings.displayMode);
    } catch (error) {
      console.error('Failed to activate Polymind view:', error);
      new Notice('Polymind failed to open interface');
      // Try fallback to tab mode if sidepanel fails
      if (this.settings.displayMode === 'sidepanel') {
        try {
          await this.changeDisplayMode('tab');
        } catch (fallbackError) {
          console.error('Failed to activate fallback tab mode:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  async changeDisplayMode(mode: 'tab' | 'sidepanel') {
    this.settings.displayMode = mode;
    await this.saveSettings();

    // Сохраняем текущее состояние чата
    const messages =
      this.currentLeaf?.view instanceof GroqChatView ? this.currentLeaf.view.getMessages() : [];

    // Закрываем текущий view
    if (this.currentLeaf) {
      this.app.workspace.detachLeavesOfType(VIEW_TYPE_GROQ_CHAT);
    }

    let leaf: WorkspaceLeaf;

    // Открываем в новом режиме с fallback
    if (mode === 'tab') {
      try {
        // Пытаемся создать лист в tab group
        leaf = this.app.workspace.getLeaf(true);
      } catch {
        // Fallback: создаем в основной области
        leaf =
          this.app.workspace.getLeaf('split', 'horizontal') || this.app.workspace.getLeaf(false);
      }
    } else {
      // Sidepanel mode
      leaf =
        this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf('split', 'vertical');
    }

    await leaf.setViewState({
      type: VIEW_TYPE_GROQ_CHAT,
      active: true,
      state: { messages }, // Передаем сохраненные сообщения
    });

    this.currentLeaf = leaf;
    await this.app.workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = { ...this.settings, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.notifyChatSettingsChanged();
  }

  // Уведомление основного чата об изменении настроек
  public notifyChatSettingsChanged() {
    if (this.currentLeaf?.view instanceof GroqChatView) {
      this.currentLeaf.view.onSettingsChanged(this.settings);
    }
  }

  // Для совместимости с интерфейсом GroqPluginInterface
  public async resetSettings() {
    await this.resetSettingsToDefault();
  }

  // Сброс настроек к значениям по умолчанию
  public async resetSettingsToDefault() {
    // Сохраняем API key перед сбросом
    const currentApiKey = this.settings.apiKey;
    this.settings = { ...this.defaultSettings };
    // Восстанавливаем API key
    this.settings.apiKey = currentApiKey;
    await this.saveSettings();
    // Обновить UI, если открыт settings tab
    if (this.settingsTab && typeof this.settingsTab.display === 'function') {
      this.settingsTab.display();
    }
    this.notifyChatSettingsChanged();
  }
}
