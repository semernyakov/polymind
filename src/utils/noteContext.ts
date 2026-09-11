import { App, TFile } from 'obsidian';
import type { GroqChatSettings } from '../settings/GroqChatSettings';

/**
 * Removes the YAML frontmatter block from a note body, if present.
 */
function stripFrontmatter(text: string): string {
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? text.slice(match[0].length) : text;
}

/**
 * Truncates a note body to maxChars. 0 (or negative) means "no limit".
 */
function cap(text: string, maxChars: number): string {
  if (!maxChars || maxChars <= 0) return text;
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…[truncated]…` : text;
}

/**
 * Extracts the file target from a wikilink, ignoring an alias (|) or a heading (#).
 */
function linkTarget(link: string): string {
  return link.split('|')[0].split('#')[0].trim();
}

/**
 * Expands [[wikilinks]] found in a single line into the actual note content.
 * Unresolved links are left untouched.
 */
async function expandLine(app: App, line: string, maxChars: number): Promise<string> {
  const re = /\[\[([^\]]+?)\]\]/g;
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(line)) !== null) {
    out += line.slice(last, match.index);
    const target = linkTarget(match[1]);
    let content = '';
    if (target) {
      const file = app.metadataCache.getFirstLinkpathDest(target, '');
      if (file instanceof TFile && file.extension === 'md') {
        try {
          content = await app.vault.cachedRead(file);
        } catch {
          content = '';
        }
      }
    }
    if (content) {
      const body = cap(stripFrontmatter(content).trim(), maxChars);
      out += `\n\n---\n### Note content: ${target}\n${body}\n---\n\n`;
    } else {
      out += match[0];
    }
    last = match.index + match[0].length;
  }

  return out + line.slice(last);
}

/**
 * Expands [[wikilinks]] across the whole message.
 * Links inside fenced code blocks (``` or ~~~) are never expanded.
 */
export async function expandWikilinks(app: App, text: string, maxChars: number): Promise<string> {
  const lines = text.split('\n');
  let fence = 0;
  const out: string[] = [];

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence++;
    out.push(fence % 2 === 0 ? await expandLine(app, line, maxChars) : line);
  }

  return out.join('\n');
}

/**
 * Appends the content of every open markdown tab as context.
 * If there are no open markdown notes, the message is returned unchanged.
 */
export async function includeOpenNotes(app: App, text: string, maxChars: number): Promise<string> {
  const leaves = app.workspace.getLeavesOfType('markdown');
  const parts: string[] = [];

  for (const leaf of leaves) {
    const file = (leaf.view as { file?: TFile | null } | undefined)?.file;
    if (!(file instanceof TFile)) continue;
    let content = '';
    try {
      content = await app.vault.cachedRead(file);
    } catch {
      content = '';
    }
    const body = cap(stripFrontmatter(content).trim(), maxChars);
    if (body) parts.push(`### Open note: ${file.basename}\n${body}`);
  }

  if (!parts.length) return text;
  return `${text}\n\n---\n**Context of open notes:**\n\n${parts.join('\n\n---\n\n')}\n---\n`;
}

/**
 * Builds the final message content sent to the API, enriching the user's
 * typed text with note context according to the plugin settings.
 */
export async function buildNoteContext(
  app: App,
  content: string,
  settings: GroqChatSettings,
): Promise<string> {
  let out = content;
  if (settings.expandWikilinks) out = await expandWikilinks(app, out, settings.maxContextChars);
  if (settings.includeOpenNotes) out = await includeOpenNotes(app, out, settings.maxContextChars);
  return out;
}
