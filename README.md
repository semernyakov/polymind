# PolyMind – Obsidian AI Chat

[![Release](https://img.shields.io/github/v/release/semernyakov/polymind?style=flat-square&label=Release)](https://github.com/semernyakov/polymind/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/semernyakov/polymind/total?style=flat-square&label=Downloads)](https://github.com/semernyakov/polymind/releases)
[![License](https://img.shields.io/github/license/semernyakov/polymind?style=flat-square&label=License)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/semernyakov/polymind/ci.yml?branch=master&style=flat-square&label=Tests)](https://github.com/semernyakov/polymind/actions/workflows/ci.yml)
[![NPM](https://img.shields.io/npm/v/polymind?style=flat-square&label=NPM)](https://www.npmjs.com/package/polymind)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa?style=flat-square&label=Contributor%20Covenant)](CODE_OF_CONDUCT.md)

<!-- [![Coverage](https://img.shields.io/codecov/c/github/semernyakov/groq-chat-plugin?style=flat-square)](https://codecov.io/gh/semernyakov/groq-chat-plugin) -->

[Русская версия](docs/README.ru.md)

**PolyMind is an AI chat plugin for Obsidian that brings your notes directly into AI conversations as context.** Use Groq and OpenRouter models, switch between models with one click, work with `[[wikilinks]]`, and keep your conversations alongside your vault.

PolyMind is designed for context-aware AI workflows without leaving Obsidian.

## Screenshots

**Main Interface**

![PolyMind main interface](docs/polymind-main.png)

**Settings Interface**

![PolyMind settings](docs/polymind-settings.png)

## Features

| Category                    | Features                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🤖 AI Integration**       | Groq and OpenRouter support<br>Dynamic model discovery and refresh<br>One-click model switching<br>Model information dialog                                             |
| **🧠 Note Context**         | Add notes from your vault as AI context<br>Expand `[[wikilinks]]` into note content<br>Include all open notes as context<br>Configurable per-note character limits      |
| **💬 Chat**                 | Persistent conversation history<br>Markdown rendering<br>Code syntax highlighting<br>Raw/Markdown source view                                                           |
| **📝 Obsidian Integration** | Work directly inside your vault<br>Create new notes from AI messages<br>Use active and open notes as conversation context                                               |
| **⚙️ Model Management**     | Model selection and grouping by provider/owner<br>Dynamic model catalog<br>Batch model activation/deactivation<br>Temperature and maximum token configuration           |
| **💾 Storage**              | Multiple history storage options:<br>• In-memory storage<br>• `localStorage`<br>• IndexedDB<br>• File-based storage<br>Configurable history length and loading behavior |
| **📱 Platform**             | Desktop and mobile support<br>Configurable display mode: tab or side panel                                                                                              |
| **🌐 Localization**         | English and Russian interface<br>Automatic language detection based on Obsidian language                                                                                |
| **🔐 Privacy**              | API keys and chat data remain on the local device<br>No telemetry or external analytics                                                                                 |
| **💝 Community**            | Open source and community-driven<br>Support dialog with donation links                                                                                                  |

## Note Context

The main feature of PolyMind is the ability to use your Obsidian vault as context for AI conversations.

Instead of copying information from your notes into a chat manually, PolyMind can add note content directly to the conversation context.

### Wikilink context

When enabled, `[[wikilinks]]` in your message can be resolved to the corresponding notes and their content can be included in the AI context.

For example:

```text
Explain the relationship between [[Project Alpha]] and [[Research Notes]].
```

PolyMind can expand the linked notes and provide their content to the selected AI model.

### Open notes as context

You can also configure PolyMind to automatically include all currently open notes as context for each message.

This is useful when working with several related notes, research materials, projects, or documentation.

### Context limits

To control the amount of information sent to the AI provider, PolyMind provides a configurable maximum character limit per note.

Set the limit to:

* a specific number of characters to restrict context size
* `0` to include the entire note

## AI Providers

PolyMind supports AI models through multiple providers.

### Groq

Groq provides access to fast AI inference and a dynamically updated model catalog.

### OpenRouter

OpenRouter provides access to models from multiple AI providers through a unified API.

The available models depend on the provider's current catalog and your provider configuration.

> Model availability is provider-dependent and can change over time. PolyMind does not maintain a static list of available models.

## Model Management

PolyMind does not ship with a fixed, hand-maintained model list.

Instead, the plugin requests the current model catalog from the configured provider and refreshes the available models when needed.

This means:

* new models can appear without a PolyMind release
* models can become unavailable or be removed by a provider
* model metadata may change over time
* the model list shown in PolyMind reflects the provider's current catalog
* different providers may expose different models and capabilities

### Refreshing models

To refresh the model list:

1. Open **Obsidian Settings**.
2. Open **PolyMind** settings.
3. Find the model configuration section.
4. Click the refresh button next to the model selector.
5. PolyMind fetches the current model catalog from the provider.
6. Select the models you want to use.

Models can be grouped by provider or owner to make large model catalogs easier to navigate.

## Project Status

PolyMind is actively developed and focuses on context-aware AI conversations inside Obsidian.

The current implementation supports:

* AI chat with Groq
* AI chat with OpenRouter
* Dynamic model discovery
* One-click model switching
* Note content as AI context
* `[[wikilink]]` expansion
* Open-note context
* Persistent chat history
* Markdown and code rendering
* Creating notes from AI responses
* Desktop and mobile usage

### Multimodal capabilities

PolyMind's current workflows are primarily focused on text and code.

Although some providers may expose models with image, audio, or other multimodal capabilities, PolyMind does not currently guarantee support for all such model capabilities.

Provider model catalogs are therefore filtered according to the capabilities currently supported by the plugin.

Additional multimodal functionality may be introduced in future releases.

## Installation

### Community Plugins

1. Open **Obsidian Settings**.
2. Go to **Community plugins**.
3. Make sure Community plugins are enabled.
4. Click **Browse**.
5. Search for **PolyMind**.
6. Install the plugin.
7. Enable PolyMind.

## Configuration

After installing PolyMind:

1. Open **Obsidian Settings**.
2. Open **PolyMind**.
3. Configure your AI provider.
4. Enter the required API key.
5. Select the models you want to use.
6. Configure chat, note context, and history settings.

### API keys

For Groq, obtain an API key from the [Groq Console](https://console.groq.com).

For OpenRouter, obtain an API key from [OpenRouter](https://openrouter.ai/).

API keys are stored locally in your Obsidian environment and are used to communicate directly with the configured provider.

### Note context settings

The **Note context** settings control how Obsidian notes are included in AI conversations.

Available options include:

* **Open chat on startup** — automatically open the PolyMind chat when Obsidian starts.
* **Expand `[[links]]` in your message** — resolve wikilinks in your message and include the referenced note content as context.
* **Include all open notes as context** — append currently open notes to the context of each message.
* **Max characters per note** — limit how much content from each note is included. Set to `0` to include the whole note.

## Usage

1. Open a note in Obsidian.
2. Open PolyMind from the sidebar.
3. Select an AI provider and model.
4. Start a conversation.
5. Add relevant notes to the conversation context using wikilinks or open-note context.
6. Continue working with your vault without leaving Obsidian.

### Example

Suppose your vault contains:

```text
Projects/
├── Project Alpha.md
├── Project Beta.md
└── Meeting Notes.md
```

You can ask:

```text
Compare [[Project Alpha]] and [[Project Beta]]
based on the latest [[Meeting Notes]].
```

With note context enabled, PolyMind can use the contents of these notes when generating the response.

## Chat History

PolyMind supports persistent chat history with multiple storage backends.

Available storage options include:

* In-memory storage
* `localStorage`
* IndexedDB
* File-based storage

You can configure:

* the history storage method
* the maximum history length
* how much history is loaded when opening a conversation

The appropriate storage option depends on your workflow and the amount of conversation history you want to retain.

## Display Modes

PolyMind can be displayed using different Obsidian layouts.

Depending on your configuration, the chat can open as:

* a dedicated tab
* a side panel

You can also configure whether the chat should open automatically when Obsidian starts.

## Mobile Support

PolyMind supports Obsidian on mobile devices.

The interface is designed to work with the same vault and provider configuration across supported Obsidian platforms.

## Test the Plugin with BRAT

You can install and test the latest development version of PolyMind using [BRAT](https://github.com/TfTHacker/obsidian42-brat), the Beta Reviewers Auto-update Tool for Obsidian.

### Steps

1. Install BRAT from Obsidian Community Plugins.
2. Open BRAT settings.
3. Click **Add Beta Plugin**.
4. Enter the repository URL:

```text
https://github.com/semernyakov/polymind
```

5. Confirm the installation.

BRAT will install the development version of PolyMind and can automatically update it when new versions are available.

## Development

Clone the repository:

```bash
git clone https://github.com/semernyakov/polymind.git
cd polymind
```

Install dependencies:

```bash
npm install
```

Run the development build:

```bash
npm run dev
```

Build the plugin:

```bash
npm run build
```

Format the code:

```bash
npm run format
```

Run linting:

```bash
npm run lint
```

## Contributing

Contributions are welcome!

Please read the [Contributing Guide](CONTRIBUTING.md) for information about the development workflow, code of conduct, and contribution process.

## Security

For security issues, please read the [Security Policy](SECURITY.md) and report vulnerabilities responsibly.

> **🔐 Security Note:** Your API keys are stored locally in your Obsidian environment and are used to communicate with the configured AI provider.

> **🛡️ Data Privacy:** PolyMind does not collect or transmit your API keys or chat data to a PolyMind server. Conversations and plugin data are stored locally according to your configured storage options. API requests are sent directly to the AI provider you configure.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## Support

If you find PolyMind useful, you can support development via:

* 💰 **YooMoney:** [Support via YooMoney](https://yoomoney.ru/fundraise/194GT5A5R07.250321)

  * Accepts transfers from Russia and other countries via bank cards
* ⭐ **Star the repository:** [Add a star on GitHub](https://github.com/semernyakov/polymind)
* 🐛 **Report issues:** [Create an issue](https://github.com/semernyakov/polymind/issues)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete change history.

---

**PolyMind — bring your Obsidian notes into the AI conversation.**
