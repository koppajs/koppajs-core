import { containsHTML, evaluateExpression, isValidLoopMatch } from './utils'
import type { Data, Refs } from './types'

type IfChainState = {
  hasHead: boolean
  resolved: boolean // true if chain already resolved by a kept if/else-if, so rest is removed
}

function createFilteredTreeWalker(rootElement: Node): TreeWalker {
  const filter: NodeFilter = {
    acceptNode(node: Node): number {
      if (node.nodeType === Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT

      // Text nodes only if they contain {{ ... }}
      if (
        node.nodeType === Node.TEXT_NODE &&
        /\{\{(.+?)\}\}/g.test(node.nodeValue || '')
      ) {
        return NodeFilter.FILTER_ACCEPT
      }

      return NodeFilter.FILTER_SKIP
    },
  }

  return document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    filter,
  )
}

function skipNode(walker: TreeWalker): Node | null {
  const current = walker.currentNode
  return current?.nextSibling
    ? (walker.currentNode = current.nextSibling)
    : walker.nextNode()
}

function replaceTemplateString(template: string, data: Data): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expression) => {
    try {
      const result = evaluateExpression(expression.trim(), data)
      return result == null ? '' : String(result)
    } catch (error) {
      console.error('❌ Error replacing', expression, ':', error)
      return ''
    }
  })
}

async function applyLoop(element: HTMLElement, data: Data, refs: Refs): Promise<void> {
  const loopDefinition = element.getAttribute('loop')
  if (!loopDefinition) return

  element.removeAttribute('loop')

  // allow: <div loop="x in items" if="..."> ... </div>
  const toplevelIf = element.getAttribute('if')
  if (toplevelIf) element.removeAttribute('if')

  const match = loopDefinition.match(/^(\w+)\s+in\s+(\w+)$/)
  if (!isValidLoopMatch(match)) {
    console.error('❌ Invalid loop definition:', loopDefinition)
    return
  }

  const [, itemVar, collectionExp] = match
  const raw = evaluateExpression(collectionExp, data)

  if (!raw || typeof raw !== 'object' || raw === null) {
    console.error('❌ Data source is not iterable:', collectionExp, raw)
    return
  }

  if (Array.isArray(raw)) {
    console.error('❌ Loop source must be a plain object, not an array:', collectionExp, raw)
    return
  }

  const entries = Object.entries(raw)
  const totalCount = entries.length
  const fragment = document.createDocumentFragment()

  let index = 0
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
    }

    if (toplevelIf && !evaluateExpression(toplevelIf, localData)) {
      index++
      continue
    }

    const cloned = element.cloneNode(true)
    if (cloned instanceof HTMLElement) {
      await processTemplate(cloned, localData, refs)
      fragment.appendChild(cloned)
    }

    index++
  }

  if (fragment.childNodes.length > 0 && element.parentNode) {
    element.parentNode.replaceChild(fragment, element)
  }
}

/**
 * Vue-like IF / ELSE-IF / ELSE chain per parent:
 * - Elements between are neutral (do not break the chain).
 * - Chain is "open" after an `if` (even if it was removed).
 * - `else-if` and `else` bind to the last open chain in the same parent.
 * - Once an `else` is processed, the chain is consumed.
 * - A new `if` starts a new chain (overwrites any previous open chain).
 */
function applyIfChainVueLoose(
  element: HTMLElement,
  data: Data,
  chainByParent: WeakMap<Node, IfChainState>,
): void {
  const parent = element.parentNode

  // Helper: get existing chain, or empty one
  const getChain = (): IfChainState | undefined => {
    if (!parent) return undefined
    return chainByParent.get(parent)
  }

  const setChain = (next: IfChainState) => {
    if (!parent) return
    chainByParent.set(parent, next)
  }

  const clearChain = () => {
    if (!parent) return
    chainByParent.delete(parent)
  }

  // IF
  const ifCond = element.getAttribute('if')
  if (ifCond !== null) {
    const ok = !!evaluateExpression(ifCond, data)

    // New IF starts a new chain for this parent (overwrite)
    setChain({ hasHead: true, resolved: ok })

    if (!ok) {
      element.remove()
    } else {
      element.removeAttribute('if')
    }
    return
  }

  // ELSE-IF
  const elseIfCond = element.getAttribute('else-if')
  if (elseIfCond !== null) {
    const chain = getChain()

    // No preceding chain
    if (!chain?.hasHead) {
      element.remove()
      return
    }

    // Chain already resolved by earlier if/else-if => remove
    if (chain.resolved) {
      element.remove()
      return
    }

    const ok = !!evaluateExpression(elseIfCond, data)

    // Update chain resolution
    setChain({ hasHead: true, resolved: ok })

    if (!ok) {
      element.remove()
    } else {
      element.removeAttribute('else-if')
    }
    return
  }

  // ELSE
  if (element.hasAttribute('else')) {
    const chain = getChain()

    // No preceding chain
    if (!chain?.hasHead) {
      element.remove()
      return
    }

    if (chain.resolved) {
      // Something earlier was kept => else removed
      element.remove()
    } else {
      // Nothing earlier kept => else kept
      element.removeAttribute('else')
    }

    // ELSE always consumes the chain
    clearChain()
    return
  }

  // Any other element: neutral (does NOT break chain)
}

async function processNodeBatch(
  pendingNodes: { node: HTMLElement | Text; data: Data }[],
  refs: Refs,
  batchSize = 50,
): Promise<void> {
  // Persist across batches: chain must survive batch boundaries
  const chainByParent = new WeakMap<Node, IfChainState>()

  for (let i = 0; i < pendingNodes.length; i += batchSize) {
    const batch = pendingNodes.slice(i, i + batchSize)

    for (const { node, data } of batch) {
      if (node instanceof HTMLElement) {
        // LOOP handled separately
        if (node.hasAttribute('loop')) {
          await applyLoop(node, data, refs).catch((err) =>
            console.error('❌ Error in applyLoop:', err),
          )
          continue
        }

        // IF / ELSE-IF / ELSE
        if (
          node.hasAttribute('if') ||
          node.hasAttribute('else') ||
          node.hasAttribute('else-if')
        ) {
          applyIfChainVueLoose(node, data, chainByParent)
          continue
        }

        // Any other element is neutral for the chain
        continue
      }

      // TEXT is neutral for the chain
      const newContent = replaceTemplateString(node.nodeValue!, data)
      if (containsHTML(newContent)) {
        const frag = document.createRange().createContextualFragment(newContent)
        node.replaceWith(frag)
      } else {
        node.nodeValue = newContent
      }
    }

    if (i + batchSize < pendingNodes.length) {
      await new Promise(requestAnimationFrame)
    }
  }
}

export async function processTemplate(root: Node, data: Data, refs: Refs): Promise<void> {
  const walker = createFilteredTreeWalker(root)
  const processed = new Set<Node>()
  const pending: { node: HTMLElement | Text; data: Data }[] = []

  let current: Node | null = walker.currentNode

  while (current) {
    if (processed.has(current)) {
      current = walker.nextNode()
      continue
    }

    processed.add(current)

    if (current.nodeType === Node.ELEMENT_NODE && current instanceof HTMLElement) {
      const el = current

      // Queue loops (and skip their subtree)
      if (el.hasAttribute('loop')) {
        pending.push({ node: el, data })
        current = skipNode(walker) || walker.nextNode()
        continue
      }

      // Queue if/else-if/else nodes for ordered evaluation
      if (el.hasAttribute('if') || el.hasAttribute('else') || el.hasAttribute('else-if')) {
        pending.push({ node: el, data })
      }

      // refs + attribute interpolation
      for (const attr of Array.from(el.attributes)) {
        if (attr.name === 'ref') refs[attr.value] = el

        if (attr.value.includes('{{')) {
          try {
            const updated = replaceTemplateString(attr.value, data)
            if (updated !== attr.value) el.setAttribute(attr.name, updated)
          } catch (err) {
            console.error(`❌ Error replacing for "${attr.name}":`, err)
          }
        }
      }

      // Don't traverse into custom elements
      if (el.tagName.includes('-')) {
        current = skipNode(walker) || walker.nextNode()
        continue
      }
    } else if (current.nodeType === Node.TEXT_NODE && current instanceof Text) {
      pending.push({ node: current, data })
    }

    current = walker.nextNode()
  }

  await processNodeBatch(pending, refs)
}
