import { Notice } from 'obsidian';
import type { App } from 'obsidian';

export class AuthService {
  private apiKeyIsSet: boolean = false;
  private apiKey: string | null = null;

  // Теперь принимаем plugin с методами saveData/loadData
  constructor(
    private readonly groqService: {
      validateApiKey: (_apiKey: string) => Promise<boolean>;
      updateApiKey?: (_apiKey: string) => void;
    },
    private readonly plugin: {
      saveData: (_data: Record<string, unknown>) => Promise<void>;
      loadData: () => Promise<Record<string, unknown> | null>;
      app?: App & {
        plugins?: {
          disablePlugin?: (_id: string) => Promise<void>;
          enablePlugin?: (_id: string) => Promise<void>;
        };
      };
    } & { id?: string },
  ) {
    if (!groqService || typeof groqService.validateApiKey !== 'function') {
      throw new Error('groqService with validateApiKey(apiKey) must be provided to AuthService');
    }
    if (!plugin || typeof plugin.saveData !== 'function' || typeof plugin.loadData !== 'function') {
      throw new Error('plugin with saveData/loadData methods must be provided to AuthService');
    }
  }

  get isAuthenticated(): boolean {
    return this.apiKeyIsSet;
  }

  /**
   * Загрузка сохранённого API-ключа при инициализации
   */

  async loadApiKey(): Promise<void> {
    const data = await this.plugin.loadData();
    /* eslint-enable-next-line @typescript-eslint/no-unused-vars */

    if (data?.apiKey && typeof data.apiKey === 'string') {
      this.apiKey = data.apiKey;
      this.apiKeyIsSet = true;
    } else {
      this.apiKey = null;
      this.apiKeyIsSet = false;
    }
  }

  /**
   * Validate API key format and then via GroqService
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!this.validateApiKeyFormat(apiKey)) {
      new Notice('Invalid API key format');
      return false;
    }
    try {
      const isValid = await this.groqService.validateApiKey(apiKey);
      if (isValid) {
        new Notice('Valid API key');
        return true;
      } else {
        new Notice('❌ Invalid API key');
        return false;
      }
    } catch (error) {
      console.error('API key validation error:', error);
      new Notice('API key validation failed. Please check your connection and try again.');
      return false;
    }
  }

  async setApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) {
      await this.clearApiKey();
      return false;
    }

    const isValid = await this.validateApiKey(apiKey);
    if (isValid) {
      await this.plugin.saveData({ apiKey });
      this.apiKey = apiKey;
      this.apiKeyIsSet = true;
      new Notice('✅ API key set successfully');

      // Update the GroqService with the new API key if the method exists
      if (this.groqService && typeof this.groqService.updateApiKey === 'function') {
        this.groqService.updateApiKey(apiKey);
      }

      // Refresh the plugin to apply changes
      await this.refreshPlugin();
      return true;
    } else {
      this.apiKeyIsSet = false;
      this.apiKey = null;
      new Notice('Invalid API key. Please check and try again.');
      return false;
    }
  }

  async clearApiKey(): Promise<void> {
    await this.plugin.saveData({ apiKey: null });
    this.apiKeyIsSet = false;
    this.apiKey = null;
    new Notice('API key cleared');
  }

  private validateApiKeyFormat(apiKey: string): boolean {
    if (!apiKey) {
      return false;
    }
    if (!/^gsk_[a-zA-Z0-9]{32,}$/.test(apiKey)) {
      return false;
    }
    return true;
  }

  /**
   * Refreshes the plugin by disabling and enabling it
   * This ensures all services are reinitialized with the new API key
   */
  private async refreshPlugin(): Promise<void> {
    if (
      !this.plugin.id ||
      !this.plugin.app?.plugins?.disablePlugin ||
      !this.plugin.app.plugins.enablePlugin
    ) {
      console.warn('Cannot refresh plugin: missing required methods');
      return;
    }

    const pluginId = this.plugin.id;
    try {
      // Disable the plugin
      await this.plugin.app.plugins.disablePlugin(pluginId);
      // Re-enable the plugin after a short delay
      setTimeout(() => {
        void (async () => {
          try {
            await this.plugin.app?.plugins?.enablePlugin?.(pluginId);
            new Notice('Plugin refreshed successfully');
          } catch (error) {
            console.error('Error re-enabling plugin:', error);
            new Notice('Error refreshing plugin. Please restart Obsidian.');
          }
        })();
      }, 1000);
    } catch (error) {
      console.error('Error disabling plugin:', error);
      new Notice('Error disabling plugin:');
    }
  }
}
