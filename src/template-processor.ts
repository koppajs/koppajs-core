// src/template-processor.ts

import { containsHTML, evaluateExpression, isValidLoopMatch } from './utils';

import type { Data, Refs } from './types';

// --- Hilfsfunktionen ---

function createFilteredTreeWalker(rootElement: Node): TreeWalker {
  const filter: NodeFilter = {
    acceptNode(node: Node): number {
      if (node.nodeType === Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
      if (node.nodeType === Node.TEXT_NODE && /\{\{(.+?)\}\}/g.test(node.nodeValue || '')) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  };

  return document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    filter,
  );
}

function skipNode(walker: TreeWalker): Node | null {
  const current = walker.currentNode;
  return current?.nextSibling ? (walker.currentNode = current.nextSibling) : walker.nextNode();
}

function replaceTemplateString(template: string, data: Data): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expression) => {
    try {
      const result = evaluateExpression(expression.trim(), data);
      return result == null ? '' : String(result);
    } catch (error) {
      console.error('❌ Error replacing', expression, ':', error);
      return '';
    }
  });
}

async function applyLoop(element: HTMLElement, data: Data, refs: Refs): Promise<void> {
  const loopDefinition = element.getAttribute('loop');
  if (!loopDefinition) return;

  element.removeAttribute('loop');

  const toplevelIf = element.getAttribute('if');
  if (toplevelIf) element.removeAttribute('if');

  const match = loopDefinition.match(/^(\w+)\s+in\s+(\w+)$/);
  if (!isValidLoopMatch(match)) {
    console.error('❌ Invalid loop definition:', loopDefinition);
    return;
  }

  const [, itemVar, collectionExp] = match;
  const raw = evaluateExpression(collectionExp, data);

  if (!raw || typeof raw !== 'object' || raw === null) {
    console.error('❌ Data source is not iterable:', collectionExp, raw);
    return;
  }

  const isArray = Array.isArray(raw);
  if (isArray) {
    console.error('❌ Loop source must be a plain object, not an array:', collectionExp, raw);
    return;
  }

  const entries = Object.entries(raw);
  const totalCount = entries.length;
  const fragment = document.createDocumentFragment();

  let index = 0;
  for (const [key, value] of entries) {
    const localData = {
      ...data,
      [itemVar]: value,
      index,
      key,
      isFirst: index === 0,
      isLast: index === totalCount - 1,
      isEven: index % 2 === 0,
      isOdd: index % 2 !== 0,
    };

    if (toplevelIf && !evaluateExpression(toplevelIf, localData)) {
      index++;
      continue;
    }

    const cloned = element.cloneNode(true);
    if (cloned instanceof HTMLElement) {
      await processTemplate(cloned, localData, refs);
      fragment.appendChild(cloned);
    }

    index++;
  }

  if (fragment.childNodes.length > 0 && element.parentNode) {
    element.parentNode.replaceChild(fragment, element);
  }
}

function applyConditionalRendering(
  previous: HTMLElement | null,
  element: HTMLElement,
  data: Data,
): void {
  const ifCond = element.getAttribute('if');
  if (ifCond !== null) {
    if (!evaluateExpression(ifCond, data)) element.remove();
    return;
  }

  if (element.hasAttribute('else')) {
    if (previous && previous.hasAttribute('if')) {
      element.remove();
    } else {
      element.removeAttribute('else');
    }
  }
}

async function processNodeBatch(
  pendingNodes: { node: HTMLElement | Text; data: Data }[],
  refs: Refs,
  batchSize = 50,
): Promise<void> {
  for (let i = 0; i < pendingNodes.length; i += batchSize) {
    const batch = pendingNodes.slice(i, i + batchSize);

    for (const [index, { node, data }] of batch.entries()) {
      if (node instanceof HTMLElement) {
        if (node.hasAttribute('loop')) {
          await applyLoop(node, data, refs).catch((err) =>
            console.error('❌ Error in applyLoop:', err),
          );
        } else if (node.hasAttribute('if')) {
          applyConditionalRendering(null, node, data);
        } else if (node.hasAttribute('else')) {
          const previous = batch[index - 1]?.node;
          applyConditionalRendering(previous instanceof HTMLElement ? previous : null, node, data);
        }
      } else {
        const newContent = replaceTemplateString(node.nodeValue!, data);
        if (containsHTML(newContent)) {
          const frag = document.createRange().createContextualFragment(newContent);
          node.replaceWith(frag);
        } else {
          node.nodeValue = newContent;
        }
      }
    }

    if (i + batchSize < pendingNodes.length) {
      await new Promise(requestAnimationFrame);
    }
  }
}

// --- Hauptfunktion ---

export async function processTemplate(root: Node, data: Data, refs: Refs): Promise<void> {
  const walker = createFilteredTreeWalker(root);
  const processed = new Set<Node>();
  const pending: { node: HTMLElement | Text; data: Data }[] = [];

  let current: Node | null = walker.currentNode;

  while (current) {
    if (processed.has(current)) {
      current = walker.nextNode();
      continue;
    }

    processed.add(current);

    if (current.nodeType === Node.ELEMENT_NODE && current instanceof HTMLElement) {
      const el: HTMLElement = current;

      if (el.hasAttribute('loop')) {
        pending.push({ node: el, data });
        current = skipNode(walker) || walker.nextNode();
        continue;
      }

      if (el.hasAttribute('if') || el.hasAttribute('else')) {
        pending.push({ node: el, data });
      }

      for (const attr of Array.from(el.attributes)) {
        if (attr.name === 'ref') refs[attr.value] = el;

        if (attr.value.includes('{{')) {
          try {
            const updated = replaceTemplateString(attr.value, data);
            if (updated !== attr.value) el.setAttribute(attr.name, updated);
          } catch (err) {
            console.error(`❌ Error replacing for "${attr.name}":`, err);
          }
        }
      }

      if (el.tagName.includes('-')) {
        current = skipNode(walker) || walker.nextNode();
        continue;
      }
    } else if (current.nodeType === Node.TEXT_NODE && current instanceof Text) {
      pending.push({ node: current, data });
    }

    current = walker.nextNode();
  }

  await processNodeBatch(pending, refs);
}
