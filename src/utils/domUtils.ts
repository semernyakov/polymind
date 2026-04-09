/**
 * Creates a link element with the specified attributes
 */
export function createLink(
  container: HTMLElement,
  text: string,
  href: string,
  options: {
    className?: string;
    target?: string;
    rel?: string;
    title?: string;
  } = {},
): HTMLAnchorElement {
  const link = container.createEl('a', {
    text,
    href,
    cls: options.className,
  });

  if (options.target) link.target = options.target;
  if (options.rel) link.rel = options.rel;
  if (options.title) link.title = options.title;

  return link;
}

/**
 * Creates a text node with optional container
 */
export function createTextNode(
  container: HTMLElement,
  text: string,
  tagName: keyof HTMLElementTagNameMap = 'span',
  className?: string,
): HTMLElement {
  const el = container.createEl(tagName, { text });
  if (className) el.className = className;
  return el;
}

/**
 * Creates a paragraph with text content
 */
export function createParagraph(
  container: HTMLElement,
  text: string,
  className?: string,
): HTMLParagraphElement {
  const p = container.createEl('p', { text });
  if (className) p.className = className;
  return p;
}

/**
 * Creates a span element with text content
 */
export function createSpan(
  container: HTMLElement,
  text: string,
  className?: string,
): HTMLSpanElement {
  const span = container.createEl('span', { text });
  if (className) span.className = className;
  return span;
}

/**
 * Creates a div element with optional class name
 */
export function createDiv(container: HTMLElement, className?: string): HTMLDivElement {
  const div = container.createDiv();
  if (className) div.className = className;
  return div;
}

/**
 * Creates a button element
 */
export function createButton(
  container: HTMLElement,
  text: string,
  onClick: (_evt: MouseEvent) => void,
  options: {
    className?: string;
    title?: string;
    icon?: string;
  } = {},
): HTMLButtonElement {
  const button = container.createEl('button', {
    text,
    cls: options.className,
  });

  if (options.title) button.title = options.title;
  if (options.icon) {
    const icon = container.createEl('span');
    icon.innerText = options.icon; // Используем безопасный метод
    button.prepend(icon);
  }

  button.addEventListener('click', onClick);
  return button;
}

/**
 * Safely removes all child nodes from a DOM element
 * @param element The DOM element to clear
 */
export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Safely appends a child element to a parent element
 */
export function appendChild<T extends HTMLElement>(parent: HTMLElement, child: T): T {
  return parent.appendChild(child);
}

/**
 * Safely inserts an element after a reference element
 */
export function insertAfter(referenceNode: HTMLElement, newNode: HTMLElement): void {
  if (referenceNode.parentNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }
}

/**
 * Creates a document fragment
 */
export function createFragment(): DocumentFragment {
  return document.createDocumentFragment();
}
