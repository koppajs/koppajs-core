// 📁 `src/TemplateProcessor.ts`
/// <reference path="../types.d.ts" />

import { containsHTML, evaluateExpression } from './utils';

/**
 * TemplateProcessor class is responsible for processing HTML templates with dynamic data.
 * It traverses the DOM, replaces template expressions with actual values,
 * and applies logic for loops and conditional rendering.
 */
export class TemplateProcessor {
  constructor() {}

  /**
   * Creates a TreeWalker instance that filters only elements and text nodes containing template expressions.
   * @param {Node} rootElement - The root element to start traversal from.
   * @returns {TreeWalker} - Configured TreeWalker instance.
   */
  private createFilteredTreeWalker(rootElement: Node): TreeWalker {
    const filter: NodeFilter = {
      acceptNode(node: Node): number {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return NodeFilter.FILTER_ACCEPT;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          return /\{\{(.+?)\}\}/g.test(node.nodeValue || '')
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
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

  /**
   * Moves the TreeWalker to the next node while skipping irrelevant siblings.
   * @param {TreeWalker} walker - The TreeWalker instance used for traversal.
   * @returns {Node | null} - The next valid node or null if no more nodes are available.
   */
  private skipNode(walker: TreeWalker): Node | null {
    let current = walker.currentNode;
    if (!current) return null;
    return current.nextSibling ? (walker.currentNode = current.nextSibling) : walker.nextNode();
  }

  /**
   * Replaces template expressions (e.g., `{{ variable }}`) with their evaluated values.
   * @param {string} template - The template string containing expressions.
   * @param {Data} data - The data context for evaluating expressions.
   * @returns {string} - The processed string with replaced values.
   */
  private replaceTemplateString(template: string, data: Data): string {
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

  /**
   * Processes loop (`loop="item in collection"`) directives in templates.
   * Iterates over collections and clones the template element for each entry.
   * @param {HTMLElement} element - The template element containing the loop directive.
   * @param {Data} data - The data context for loop evaluation.
   * @param {Refs} refs - Reference object to store identified elements.
   * @returns {Promise<void>} - Resolves once the loop is processed.
   */
  private async applyLoop(element: HTMLElement, data: Data, refs: Refs): Promise<void> {
    const loopDefinition = element.getAttribute('loop');
    element.removeAttribute('loop');
    const toplevelIf = element.getAttribute('if');
    element.removeAttribute('if');

    const match = loopDefinition!.match(/^(\w+)\s+in\s+(\w+)$/);
    if (!match) {
      console.error('❌ Invalid loop definition:', loopDefinition);
      return;
    }

    const [_, itemVariable, collectionExp] = match;
    const collection = evaluateExpression(collectionExp!, data);

    if (!collection || typeof collection !== 'object') {
      console.error('❌ Data source is not iterable:', collectionExp, collection);
      return;
    }

    const isArray = Array.isArray(collection);
    const entries: [string | number, any][] = isArray
      ? Array.from(collection.entries())
      : Object.entries(collection);

    const totalCount = entries.length;

    const fragment = document.createDocumentFragment();

    for (const [key, value] of entries) {
      const index = isArray ? (key as number) : undefined;
      const objKey = isArray ? undefined : key;

      const localData = {
        ...data,
        [itemVariable!]: value,
        index,
        key: objKey,
        isFirst: index === 0,
        isLast: index === totalCount - 1,
        isEven: index! % 2 === 0,
        isOdd: index! % 2 !== 0,
      };

      if (toplevelIf && !evaluateExpression(toplevelIf, localData)) {
        continue;
      }

      const clonedElement = element.cloneNode(true) as HTMLElement;
      await this.processTemplate(clonedElement, localData, refs);
      fragment.appendChild(clonedElement);
    }

    if (fragment.childNodes.length > 0 && element.parentNode) {
      element.parentNode.replaceChild(fragment, element);
    }
  }

  /**
   * Processes conditional rendering based on `if` and `else` attributes.
   * @param {HTMLElement | null} previousNode - The previous sibling element.
   * @param {HTMLElement} element - The current element with a condition.
   * @param {Data} data - The data context for evaluating the condition.
   */
  private applyConditionalRendering(
    previousNode: HTMLElement | null,
    element: HTMLElement,
    data: Data,
  ): void {
    const ifCondition = element.getAttribute('if');
    if (ifCondition !== null) {
      if (!evaluateExpression(ifCondition, data)) {
        element.remove();
      }
      return;
    }

    if (element.hasAttribute('else')) {
      if (previousNode && previousNode.hasAttribute('if')) {
        element.remove();
        return;
      }
      element.removeAttribute('else');
    }
  }

  /**
   * Processes a batch of nodes asynchronously to improve performance.
   * @param {Array<{ node: HTMLElement | Text, data: Data }>} pendingNodes - Nodes awaiting processing.
   * @param {Refs} refs - Reference object to store identified elements.
   * @param {number} [batchSize=50] - The number of nodes processed in each batch.
   */
  private async processNodeBatch(
    pendingNodes: { node: HTMLElement | Text; data: Data }[],
    refs: Refs,
    batchSize = 50,
  ): Promise<void> {
    for (let i = 0; i < pendingNodes.length; i += batchSize) {
      const batch = pendingNodes.slice(i, i + batchSize);

      for (const [index, pendingData] of batch.entries()) {
        const { node, data } = pendingData;

        if (node instanceof HTMLElement) {
          if (node.hasAttribute('loop')) {
            this.applyLoop(node, data, refs).catch((error) => {
              console.error('❌ Error in applyLoop:', error);
            });
          } else if (node.hasAttribute('if')) {
            this.applyConditionalRendering(null, node, data);
          } else if (node.hasAttribute('else')) {
            const previousNode = batch[index - 1]?.node;
            this.applyConditionalRendering(
              previousNode instanceof HTMLElement ? previousNode : null,
              node,
              data,
            );
          }
        } else {
          const newContent = this.replaceTemplateString(node.nodeValue!, data);

          if (containsHTML(newContent)) {
            const fragment = document.createRange().createContextualFragment(newContent);
            node.replaceWith(fragment);
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

  /**
   * Traverses the DOM and processes template elements asynchronously in batches for better performance.
   *
   * - Identifies `{{}}` placeholders and replaces them with actual data values.
   * - Detects and stores elements with `ref` attributes in `refs` for direct access.
   * - Handles `if`, `else`, and `loop` directives for conditional and repeated rendering.
   * - Skips processing of Web Components (custom elements with `-` in their tag name).
   * - Uses a `TreeWalker` to efficiently traverse only relevant nodes.
   * - Processes nodes in batches to optimize rendering performance.
   *
   * @param {Node} rootElement - The root element to start traversal from.
   * @param {Data} data - The data context for evaluating template expressions.
   * @param {Refs} refs - Reference object to store identified elements.
   * @returns {Promise<void>} - Resolves once all nodes have been processed.
   */
  public async processTemplate(rootElement: Node, data: Data, refs: Refs): Promise<void> {
    let walker: TreeWalker | null = this.createFilteredTreeWalker(rootElement);
    const processedNodes = new Set<Node>();
    let currentNode: Node | null = walker.currentNode;
    const pendingNodes: { node: HTMLElement | Text; data: Data }[] = [];

    while (currentNode) {
      if (processedNodes.has(currentNode)) {
        console.warn('⚠️ Node already processed, skipping:', currentNode);
        currentNode = walker.nextNode();
        continue;
      }

      processedNodes.add(currentNode);

      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const elementNode = currentNode as HTMLElement;

        if (elementNode.hasAttribute('loop')) {
          pendingNodes.push({ node: elementNode, data });

          currentNode = this.skipNode(walker) || walker.nextNode();
          continue;
        }

        if (elementNode.hasAttribute('if') || elementNode.hasAttribute('else')) {
          pendingNodes.push({ node: elementNode, data });
        }

        for (let i = 0; i < elementNode.attributes.length; i++) {
          const attr = elementNode.attributes[i];
          if (attr) {
            if (attr.name === 'ref') refs[attr.value] = elementNode;
            if (attr.value.includes('{{')) {
              try {
                const newValue = this.replaceTemplateString(attr.value, data);
                if (newValue !== attr.value) {
                  elementNode.setAttribute(attr.name, newValue);
                }
              } catch (error) {
                console.error(`❌ Error replacing for "${attr.name}":`, error);
              }
            }
          }
        }

        if (elementNode.tagName.includes('-')) {
          currentNode = this.skipNode(walker) || walker.nextNode();
          continue;
        }
      } else if (currentNode.nodeType === Node.TEXT_NODE && currentNode instanceof Text) {
        pendingNodes.push({ node: currentNode, data });
      }

      currentNode = walker.nextNode();
    }

    walker = null;
    await this.processNodeBatch(pendingNodes, refs);
  }
}
