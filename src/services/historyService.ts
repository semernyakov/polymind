import { GroqPluginInterface } from '../types/plugin';
import { Message } from '../types/types';
import { TFile, Notice } from 'obsidian';
import { HistoryStorageMethod } from '../types/settings';

const IDB_NAME = 'groq-chat-history';
const IDB_STORE_NAME = 'history';
const IDB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'groq-chat-history';

export class HistoryService {
  private memoryHistory: Message[] = [];
  private plugin: GroqPluginInterface;

  constructor(plugin: GroqPluginInterface) {
    this.plugin = plugin;
  }

  async getHistory(): Promise<Message[]> {
    try {
      const method = this.plugin.settings.historyStorageMethod;
      const fullHistory = await this.getHistoryByMethod(method);
      return this.truncateHistory(fullHistory, this.plugin.settings.maxHistoryLength);
    } catch (error) {
      this.handleError('Error loading history', error);
      return [];
    }
  }

  async addMessage(message: Message): Promise<void> {
    try {
      const currentHistory = await this.getHistory();
      const newHistory = [...currentHistory, message];
      await this.saveHistory(newHistory);
    } catch (error) {
      this.handleError('Error saving message', error);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await this.clearByMethod(this.plugin.settings.historyStorageMethod);
      new Notice('History cleared');
    } catch (error) {
      this.handleError('Error clearing history', error);
    }
  }

  private async getHistoryByMethod(method: HistoryStorageMethod): Promise<Message[]> {
    switch (method) {
      case 'memory':
        return [...this.memoryHistory];
      case 'localStorage':
        return this.getFromLocalStorage();
      case 'indexedDB':
        return this.getFromIndexedDB();
      case 'file':
        return this.getFromFile();
      default:
        // console.warn(`Unknown history storage method: ${method}`);
        return [];
    }
  }

  private async saveHistory(history: Message[]): Promise<void> {
    const method = this.plugin.settings.historyStorageMethod;
    const truncated = this.truncateHistory(history, this.plugin.settings.maxHistoryLength);

    switch (method) {
      case 'memory':
        this.memoryHistory = truncated;
        break;
      case 'localStorage':
        this.saveToLocalStorage(truncated);
        break;
      case 'indexedDB':
        await this.saveToIndexedDB(truncated);
        break;
      case 'file':
        await this.saveToFile(truncated);
        break;
      default:
      // console.warn(`Unknown history storage method: ${method}`);
    }
  }

  private truncateHistory(history: Message[], maxLength: number): Message[] {
    if (maxLength <= 0) {
      return [];
    }
    return history.slice(-maxLength);
  }

  private getFromLocalStorage(): Message[] {
    try {
      const data = this.plugin.app.loadLocalStorage(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage', error);
      this.plugin.app.saveLocalStorage(LOCAL_STORAGE_KEY, null);
      return [];
    }
  }

  private saveToLocalStorage(history: Message[]): void {
    try {
      this.plugin.app.saveLocalStorage(LOCAL_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving to localStorage', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        new Notice('Failed to save history: local storage quota exceeded.');
      }
    }
  }

  private async getFromIndexedDB(): Promise<Message[]> {
    try {
      const db = await this.openHistoryDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = event => {
          resolve((event.target as IDBRequest<Message[]>).result);
        };

        request.onerror = event => {
          console.error('IndexedDB getAll error:', (event.target as IDBRequest).error);
          reject(
            new Error(
              `IndexedDB getAll error: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`,
            ),
          );
        };
      });
    } catch (error) {
      console.error('Failed to get history from IndexedDB', error);
      return [];
    }
  }

  private async saveToIndexedDB(history: Message[]): Promise<void> {
    try {
      const db = await this.openHistoryDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);

        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          const putPromises = history.map(msg => {
            return new Promise<void>((res, rej) => {
              const req = store.put(msg);
              req.onsuccess = () => res();
              req.onerror = event =>
                rej(
                  new Error(
                    `IndexedDB put error: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`,
                  ),
                );
            });
          });

          Promise.all(putPromises)
            .then(() => {
              console.warn('IndexedDB save successful');
              resolve();
            })
            .catch(err => {
              console.error('IndexedDB put error:', err);
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        };

        clearRequest.onerror = event => {
          console.error('IndexedDB clear error:', (event.target as IDBRequest).error);
          reject(
            new Error(
              `IndexedDB clear error: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`,
            ),
          );
        };

        transaction.onerror = event => {
          console.error('IndexedDB transaction error:', (event.target as IDBTransaction).error);
          reject(
            new Error(
              `IndexedDB transaction error: ${(event.target as IDBTransaction).error?.message || 'Unknown error'}`,
            ),
          );
        };

        transaction.oncomplete = () => {};
      });
    } catch (error) {
      console.error('Failed to save history to IndexedDB', error);
      throw error;
    }
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      const db = await this.openHistoryDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.warn('IndexedDB cleared successfully');
          resolve();
        };
        request.onerror = event => {
          console.error('IndexedDB clear error:', (event.target as IDBRequest).error);
          reject(
            new Error(
              `IndexedDB clear error: ${(event.target as IDBRequest).error?.message || 'Unknown error'}`,
            ),
          );
        };
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB', error);
      throw error;
    }
  }

  private async getFromFile(): Promise<Message[]> {
    try {
      const path = this.plugin.settings.notePath;
      if (!path) return [];

      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        const content = await this.plugin.app.vault.read(file);
        return content ? JSON.parse(content) : [];
      }
      return [];
    } catch (error) {
      this.handleError('Error reading history file', error);
      return [];
    }
  }

  private async saveToFile(history: Message[]): Promise<void> {
    const path = this.plugin.settings.notePath;
    if (!path) {
      this.handleError('History file path is not set', new Error('Cannot save history to file'));
      return;
    }

    try {
      const content = JSON.stringify(history, null, 2);
      const file = this.plugin.app.vault.getAbstractFileByPath(path);

      if (file instanceof TFile) {
        await this.plugin.app.vault.modify(file, content);
      } else {
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir && !(await this.plugin.app.vault.adapter.exists(dir))) {
          await this.plugin.app.vault.createFolder(dir);
        }
        await this.plugin.app.vault.create(path, content);
      }
    } catch (error) {
      this.handleError('Error saving history to file', error);
    }
  }

  private async clearFile(): Promise<void> {
    const path = this.plugin.settings.notePath;
    if (!path) return;

    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        await this.plugin.app.vault.modify(file, '[]');
      }
    } catch (error) {
      this.handleError('Error clearing history file', error);
    }
  }

  private async clearByMethod(method: HistoryStorageMethod): Promise<void> {
    switch (method) {
      case 'memory':
        this.memoryHistory = [];
        break;
      case 'localStorage':
        this.plugin.app.saveLocalStorage(LOCAL_STORAGE_KEY, null);
        break;
      case 'indexedDB':
        await this.clearIndexedDB();
        break;
      case 'file':
        await this.clearFile();
        break;
      default:
      // console.warn(`Unknown history storage method: ${method}`);
    }
  }

  private handleError(context: string, error: unknown): void {
    new Notice(`${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  private openHistoryDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { autoIncrement: true });
        }
      };

      request.onsuccess = event => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = event => {
        reject(
          new Error(
            `IndexedDB open error: ${(event.target as IDBOpenDBRequest).error?.message || 'Unknown error'}`,
          ),
        );
      };

      request.onblocked = () => {
        reject(new Error('IndexedDB is blocked'));
      };
    });
  }
}
