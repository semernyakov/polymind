import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import { ChatPanel } from '../components/ChatPanel';
import type { GroqPluginInterface } from '../types/plugin';
import { GroqChatSettings } from '../settings/GroqChatSettings';
import { Message } from '../types/types';

export const VIEW_TYPE_GROQ_CHAT = 'groq-chat-view';

interface GroqChatViewState {
  messages?: Message[];
}

export class GroqChatView extends ItemView {
  private root: ReturnType<typeof createRoot> | null = null;
  private messages: Message[] = [];
  private plugin: GroqPluginInterface;

  constructor(leaf: WorkspaceLeaf, plugin: GroqPluginInterface, state?: GroqChatViewState) {
    super(leaf);
    this.plugin = plugin;
    this.messages = state?.messages || [];
  }

  getViewType() {
    return VIEW_TYPE_GROQ_CHAT;
  }

  getDisplayText() {
    return 'Polymind';
  }

  getIcon() {
    return 'message-square';
  }

  getMessages(): Message[] {
    return this.messages;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  // Required by ItemView base class signature
  async onOpen() {
    this.renderView();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  // Required by ItemView base class signature
  async onClose() {
    this.root?.unmount();
  }

  private renderView() {
    const container = this.containerEl.children[1];
    container.empty();

    const rootEl = container.createDiv({ cls: 'groq-container' });
    this.root = createRoot(rootEl);
    this.root.render(
      <ChatPanel
        plugin={this.plugin}
        displayMode={this.plugin.settings.displayMode}
        initialMessages={this.messages}
        onDisplayModeChange={mode => void this.plugin.changeDisplayMode(mode)}
      />,
    );
  }

  // Метод для синхронизации настроек с основного окна
  public onSettingsChanged(newSettings: GroqChatSettings) {
    // Обновить ссылку на актуальные настройки
    const plugin = this.plugin as GroqPluginInterface & { settings: GroqChatSettings };
    plugin.settings = { ...plugin.settings, ...newSettings };
    this.renderView();
  }
}
