# PolyMind – Obsidian Plugin

[![Release](https://img.shields.io/github/v/release/semernyakov/polymind?style=flat-square&label=Release)](https://github.com/semernyakov/polymind/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/semernyakov/polymind/total?style=flat-square&label=Downloads)](https://github.com/semernyakov/polymind/releases)
[![License](https://img.shields.io/github/license/semernyakov/polymind?style=flat-square&label=License)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/semernyakov/polymind/ci.yml?branch=master&style=flat-square&label=Tests)](https://github.com/semernyakov/polymind/actions/workflows/ci.yml)
[![NPM](https://img.shields.io/npm/v/polymind?style=flat-square&label=NPM)](https://www.npmjs.com/package/polymind)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa?style=flat-square&label=Contributor%20Covenant)](CODE_OF_CONDUCT.md)

<!-- [![Coverage](https://img.shields.io/codecov/c/github/semernyakov/groq-chat-plugin?style=flat-square)](https://codecov.io/gh/semernyakov/groq-chat-plugin) -->

[Русская версия](docs/README.ru.md)

PolyMind is an Obsidian plugin for **Groq AI** with automatic model refresh in real time. It stores chat history, supports Markdown, and helps manage note context and interface settings.

> Current support: **Groq** only. **OpenRouter** is not enabled in this build yet, but adding a second provider is planned for a future update.

## Screenshots

**Main Interface**

![polymind-main.png](docs/polymind-main.png)

**Settings Interface**

![polymind-settings.png](docs/polymind-settings.png)

## Features

| Category              | Features                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🤖 AI Integration** | Direct integration with Groq AI models<br>Dynamic model list: models are updated in real-time<br>Model Info Dialog: detailed info for each model<br>Current focus: text and code chat workflows |
| **🌐 Localization**   | Localized interface (English/Russian)<br>Automatically detects Obsidian language                                                                                                                              |
| **📝 Content**        | Markdown formatting and code highlighting<br>Raw/Markdown source view toggle<br>Note context: expand [[links]] into note content, include open notes as context<br>Create new notes from AI messages          |

| **📱 Platform** | Mobile support<br>Configurable default display mode (tab or side panel) |
| **⚙️ Model Management** | Custom model selection with grouping by model owner<br>Batch model activation/deactivation<br>Temperature and max tokens configuration |
| **💾 Storage** | Chat history with multiple storage options:<br>• In-memory storage<br>• localStorage<br>• IndexedDB<br>• File-based storage<br>Configurable history length and loading behavior |
| **🔐 Security** | Secure API key storage<br>Hotkeys and advanced settings |
| **💝 Community** | Support dialog with donation links<br>Open source and community-driven |

## Project Status

This project is actively maintained and developed. The current implementation is focused on text and code chat workflows via the Groq API, note-context enrichment, and history management. In the current release, only two primary modes are supported: text/code chat and note-context enrichment. Image and audio input/output are not supported, and these capabilities remain work in progress.

### Current model support

At the moment, PolyMind is primarily aimed at text-based chat models and code-oriented workflows. The plugin intentionally filters out non-chat entries such as image and audio models from the UI, because those multimodal capabilities are not supported yet.

The plugin does not maintain a fixed built-in model list. Instead, it requests the current model catalog from the provider at runtime and refreshes the available model list in the settings UI.

This means:

- model availability can change over time without a plugin release
- new models appear automatically after a refresh
- some models may be temporarily unavailable or hidden by the provider
- multimodal models (image/audio) are not currently supported even if the provider exposes them
- the list shown in the app is the source of truth, not a static README table

### Model availability

The plugin does not maintain a fixed built-in model list. Instead, it requests the current model catalog from the provider at runtime and refreshes the available model list in the settings UI.

This means:

- model availability can change over time without a plugin release
- new models appear automatically after a refresh
- some models may be temporarily unavailable or hidden by the provider
- the list shown in the app is the source of truth, not a static README table

To refresh the list, open plugin settings and use the model refresh button. The app groups models by owner and filters out non-chat entries such as speech, image, and audio models when relevant.

> The list below is only an example and may be outdated by the time you read it. Always check the in-app list in the plugin settings.

> The current release supports only text models. Image and audio support is still in progress, and additional provider support is planned for future releases.

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "PolyMind"
4. Install the plugin
5. Enable the plugin in Community Plugins

## Configuration

1. Get your API key from [Groq Console](https://console.groq.com)
2. Open plugin settings in Obsidian
3. Enter your API key
4. Configure additional settings as needed (Note: Settings have been updated, including options for default display mode and history storage. See plugin settings for details.)

Under **Note context** you can control whether the chat opens automatically when Obsidian starts (`Open chat on startup`), whether `[[wikilinks]]` in your messages are expanded into the actual note content (`Expand [[links]] in your message`), whether all open notes are appended as context to every message (`Include all open notes as context`), and the per-note character limit (`Max characters per note`, `0` = whole note).

### How model refresh works

The plugin does not ship with a static, hand-maintained model list. Instead, it fetches the current model catalogue from Groq when needed and refreshes the list in settings.

Typical flow:

1. Open plugin settings.
2. Click the refresh button next to the model selector.
3. The app calls the provider API and loads the current model list.
4. The UI groups models by owner and filters non-chat entries when applicable.
5. The selected model is saved back into plugin settings.

Because the list is provider-driven, model availability can change without a new plugin release. If a model disappears, is renamed, or is temporarily unavailable, the next refresh updates the list automatically.

## Usage

1. Open any note in Obsidian
2. Click the PolyMind icon in the sidebar
3. Select the model you want (models update in real time)
4. Start chatting with AI (text, code)
5. View model info any time via the Model Info Dialog

## Test the Plugin with BRAT

You can install and test the latest development version of the plugin using the [BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tool) plugin for Obsidian.

**Steps**

1. Install BRAT from the Obsidian Community Plugins.
2. Open BRAT settings.
3. Click Add Beta Plugin.
4. Paste the repository URL: https://github.com/semernyakov/polymind
5. Confirm installation.

BRAT will automatically install the plugin and allow you to receive updates directly from the repository.

## Development

```bash
# Clone the repository
git clone https://github.com/semernyakov/polymind.git

# Install dependencies
npm install

# Development mode
npm run dev

# Build the plugin
npm run build

# Formatting
npm run format

# Lint the code
npm run lint
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

For security issues, please read our [Security Policy](SECURITY.md) and report any vulnerabilities responsibly.

> **🔐 Security Note:** Your Groq API key is stored only on your local device and is never transmitted to any server.
>
> **🛡️ Data Privacy:** This plugin does not collect, store, or transmit your API keys or chat data. All data remains on your local device.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Support

If you find PolyMind helpful, you can support development via:

- 💰 **YooMoney**: [Support via YooMoney](https://yoomoney.ru/fundraise/194GT5A5R07.250321)
  - Accepts transfers from both Russia and other Countries (via bank cards)
- ⭐ **Star the repository**: [Add a star on GitHub](https://github.com/semernyakov/polymind)
- 🐛 **Report issues**: [Create an issue](https://github.com/semernyakov/polymind/issues)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for all changes.

---
