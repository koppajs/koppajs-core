import { containsHTML, evaluateExpression, logger } from './utils'
import { setSlotId } from './utils'
import { getSlotIdsForArray } from './model'
import type { State, Refs } from './types'

type IfChainState = {
  hasHead: boolean
  resolved: boolean // true if chain already resolved by a kept if/else-if, so rest is removed
}

/**
 * Represents a parsed loop binding - either a single variable or a tuple [key, value].
 */
type LoopBinding =
  | { type: 'single'; itemVar: string }
  | { type: 'tuple'; keyVar: string; itemVar: string }

const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/**
 * Parses loop binding syntax: either "item" or "[key, item]".
 * @param bindingStr - The binding string to parse
 * @returns Parsed binding object
 * @throws Error if binding syntax is invalid
 */
function parseLoopBinding(bindingStr: string): LoopBinding {
  const trimmed = bindingStr.trim()

  // Check for tuple binding: [key, item]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
    const parts = inner.split(',').map((p) => p.trim())

    if (parts.length !== 2) {
      throw new Error('Invalid loop binding: expected <id> or [<id>, <id>]')
    }

    const [keyVar, itemVar] = parts

    if (!IDENTIFIER_REGEX.test(keyVar) || !IDENTIFIER_REGEX.test(itemVar)) {
      throw new Error('Invalid loop binding: expected <id> or [<id>, <id>]')
    }

    return { type: 'tuple', keyVar, itemVar }
  }

  // Single binding: item
  if (!IDENTIFIER_REGEX.test(trimmed)) {
    throw new Error('Invalid loop binding: expected <id> or [<id>, <id>]')
  }

  return { type: 'single', itemVar: trimmed }
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

/**
 * Skips to the next node in the tree walker.
 * @param walker - TreeWalker instance
 * @returns Next node or null
 */
function skipNode(walker: TreeWalker): Node | null {
  const current = walker.currentNode
  return current?.nextSibling
    ? (walker.currentNode = current.nextSibling)
    : walker.nextNode()
}

/**
 * Skips the entire subtree of the current node and moves to the next sibling or ancestor's sibling.
 * This is used to skip processing children of loop elements since they will be processed
 * recursively with the correct local state.
 * @param walker - TreeWalker instance
 * @param element - The element whose subtree should be skipped
 * @returns Next node outside the subtree or null
 */
function skipSubtree(walker: TreeWalker, element: Node): Node | null {
  let next: Node | null = element.nextSibling

  // If no next sibling, walk up to find an ancestor with a next sibling
  if (!next) {
    let parent = element.parentNode
    while (parent && parent !== walker.root) {
      if (parent.nextSibling) {
        next = parent.nextSibling
        break
      }
      parent = parent.parentNode
    }
  }

  if (next) {
    walker.currentNode = next
    return next
  }

  return null
}

/**
 * Converts a template expression result to a string for rendering.
 * - null/undefined => ""
 * - true/false => ""
 * - otherwise => String(value) (e.g., 0 becomes "0")
 * @param value - The value to stringify
 * @returns String representation for template output
 */
function stringifyTemplateValue(value: unknown): string {
  if (value == null) return ''
  if (value === true || value === false) return ''
  return String(value)
}

/**
 * Replaces {{ expression }} template strings with evaluated values.
 * @param template - Template string with {{ }} expressions
 * @param state - State object for evaluation
 * @returns String with expressions replaced
 */
function replaceTemplateString(template: string, state: State): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expression) => {
    const result = evaluateExpression(expression.trim(), state)
    return stringifyTemplateValue(result)
  })
}

/**
 * Applies loop directive to an element, creating multiple instances.
 * Supports both single binding (item in items) and tuple binding ([key, item] in items).
 * @param element - Element with loop attribute
 * @param state - Component state
 * @param refs - Component element references
 */
export async function applyLoop(
  element: HTMLElement,
  state: State,
  refs: Refs,
): Promise<void> {
  const loopDefinition = element.getAttribute('loop')
  if (!loopDefinition) return

  element.removeAttribute('loop')

  // allow: <div loop="x in items" if="..."> ... </div>
  const toplevelIf = element.getAttribute('if')
  if (toplevelIf) element.removeAttribute('if')

  // Updated regex to capture the full binding part (single or tuple)
  const match = loopDefinition.match(/^(.+?)\s+in\s+(.+)$/)
  if (!match) {
    throw new Error('Invalid loop binding: expected <id> or [<id>, <id>]')
  }

  const [, bindingStr, collectionExp] = match
  const binding = parseLoopBinding(bindingStr)
  const raw = evaluateExpression(collectionExp.trim(), state)

  // Allow empty arrays/objects - they just render nothing
  if (raw === null || raw === undefined) {
    element.remove()
    return
  }

  if (typeof raw !== 'object') {
    logger.error('State source is not iterable', { collectionExp, raw })
    return
  }

  const isArray = Array.isArray(raw)
  const entries: [string, unknown][] = isArray
    ? (raw as unknown[]).map((value, idx) => [String(idx), value])
    : Object.entries(raw)
  const totalCount = entries.length
  const fragment = document.createDocumentFragment()

  let index = 0
  for (const [key, value] of entries) {
    // Build local state with binding variables and implicit loop variables
    const localState: State = {
      ...state,
      // Implicit loop variables (always available for backwards compatibility)
      index,
      key,
      isFirst: index === 0,
      isLast: index === totalCount - 1,
      isEven: index % 2 === 0,
      isOdd: index % 2 !== 0,
    }

    // Apply binding
    if (binding.type === 'single') {
      localState[binding.itemVar] = value
    } else {
      // Tuple binding: first identifier gets key, second gets value
      localState[binding.keyVar] = key
      localState[binding.itemVar] = value
    }

    if (toplevelIf && !evaluateExpression(toplevelIf, localState)) {
      index++
      continue
    }

    const cloned = element.cloneNode(true)
    // Attach slotId from model sidecar for array iteration
    if (isArray && cloned instanceof HTMLElement) {
      const slotIds = getSlotIdsForArray(raw as unknown[])
      if (slotIds && slotIds[index] !== undefined) {
        setSlotId(cloned, slotIds[index])
      }
      // If slotIds is missing or slotIds[index] is missing, gracefully skip (no slotId attached)
    }
    if (cloned instanceof HTMLElement) {
      await processTemplate(cloned, localState, refs)
      fragment.appendChild(cloned)
    }

    index++
  }

  if (fragment.childNodes.length > 0 && element.parentNode) {
    element.parentNode.replaceChild(fragment, element)
  } else {
    // Empty collection - remove the template element
    element.remove()
  }
}

/**
 * Applies Vue-like if/else-if/else chain logic to an element.
 * Maintains chain state per parent element to handle nested conditionals.
 * - Elements between are neutral (do not break the chain).
 * - Chain is "open" after an `if` (even if it was removed).
 * - `else-if` and `else` bind to the last open chain in the same parent.
 * - Once an `else` is processed, the chain is consumed.
 * - A new `if` starts a new chain (overwrites any previous open chain).
 * @param element - Element with if/else-if/else attribute
 * @param state - Component state for condition evaluation
 * @param chainByParent - WeakMap storing chain state per parent node
 */
function applyIfChainVueLoose(
  element: HTMLElement,
  state: State,
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
    const ok = !!evaluateExpression(ifCond, state)

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

    const ok = !!evaluateExpression(elseIfCond, state)

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
  pendingNodes: { node: HTMLElement | Text; state: State }[],
  refs: Refs,
  batchSize = 50,
): Promise<void> {
  // Persist across batches: chain must survive batch boundaries
  const chainByParent = new WeakMap<Node, IfChainState>()

  for (let i = 0; i < pendingNodes.length; i += batchSize) {
    const batch = pendingNodes.slice(i, i + batchSize)

    for (const { node, state } of batch) {
      if (node instanceof HTMLElement) {
        // LOOP handled separately
        if (node.hasAttribute('loop')) {
          await applyLoop(node, state, refs)
          continue
        }

        // IF / ELSE-IF / ELSE
        if (
          node.hasAttribute('if') ||
          node.hasAttribute('else') ||
          node.hasAttribute('else-if')
        ) {
          applyIfChainVueLoose(node, state, chainByParent)
          continue
        }

        // Any other element is neutral for the chain
        continue
      }

      // TEXT is neutral for the chain
      const newContent = replaceTemplateString(node.nodeValue!, state)
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

/**
 * Processes a template tree, evaluating expressions, loops, and conditionals.
 * Handles attribute interpolation, ref collection, and text node replacement.
 * @param root - Root node to process
 * @param state - Component state for expression evaluation
 * @param refs - Component element references (populated during processing)
 */
export async function processTemplate(
  root: Node,
  state: State,
  refs: Refs,
): Promise<void> {
  try {
    const walker = createFilteredTreeWalker(root)
    const processed = new Set<Node>()
    const pending: { node: HTMLElement | Text; state: State }[] = []

    let current: Node | null = walker.currentNode

    while (current) {
      if (processed.has(current)) {
        current = walker.nextNode()
        continue
      }

      processed.add(current)

      if (current.nodeType === Node.ELEMENT_NODE && current instanceof HTMLElement) {
        const el = current

        // Queue loops (and skip their subtree completely)
        if (el.hasAttribute('loop')) {
          pending.push({ node: el, state })
          current = skipSubtree(walker, el)
          continue
        }

        // Queue if/else-if/else nodes for ordered evaluation
        if (
          el.hasAttribute('if') ||
          el.hasAttribute('else') ||
          el.hasAttribute('else-if')
        ) {
          pending.push({ node: el, state })
        }

        // refs + attribute interpolation + dynamic bindings
        for (const attr of Array.from(el.attributes)) {
          if (attr.name === 'ref') refs[attr.value] = el

          // Handle dynamic attribute bindings (:class, :href, :data-*, etc.)
          if (attr.name.startsWith(':')) {
            const realAttrName = attr.name.slice(1)
            const expr = attr.value.trim()

            try {
              const evaluated = evaluateExpression(expr, state)

              // Special handling for :class with object syntax
              if (
                realAttrName === 'class' &&
                typeof evaluated === 'object' &&
                evaluated !== null
              ) {
                const classesToAdd: string[] = []
                for (const [className, condition] of Object.entries(evaluated)) {
                  if (condition) {
                    classesToAdd.push(className)
                  }
                }
                if (classesToAdd.length > 0) {
                  const existingClasses = el.getAttribute('class') || ''
                  const newClasses = existingClasses
                    ? `${existingClasses} ${classesToAdd.join(' ')}`
                    : classesToAdd.join(' ')
                  el.setAttribute('class', newClasses)
                }
              } else if (
                evaluated !== null &&
                evaluated !== undefined &&
                evaluated !== false
              ) {
                // For boolean true, just set the attribute without value
                if (evaluated === true) {
                  el.setAttribute(realAttrName, '')
                } else {
                  el.setAttribute(realAttrName, String(evaluated))
                }
              }

              // Remove the dynamic binding attribute
              el.removeAttribute(attr.name)
            } catch (err) {
              logger.errorWithContext(
                `Error evaluating dynamic attribute "${attr.name}"`,
                { attributeName: attr.name, expression: expr },
                err,
              )
            }
            continue
          }

          if (attr.value.includes('{{')) {
            try {
              let updated = replaceTemplateString(attr.value, state)
              // Normalize whitespace for class attributes only
              if (attr.name === 'class') {
                updated = updated.replace(/\s+/g, ' ').trim()
              }
              if (updated !== attr.value) el.setAttribute(attr.name, updated)
            } catch (err) {
              logger.errorWithContext(
                `Error replacing attribute "${attr.name}"`,
                { attributeName: attr.name },
                err,
              )
            }
          }
        }

        // Don't traverse into custom elements
        if (el.tagName.includes('-')) {
          current = skipNode(walker) || walker.nextNode()
          continue
        }
      } else if (current.nodeType === Node.TEXT_NODE && current instanceof Text) {
        // Skip text nodes inside custom elements
        let parent = current.parentElement
        let isInsideCustomElement = false
        while (parent) {
          if (parent.tagName.includes('-')) {
            isInsideCustomElement = true
            break
          }
          parent = parent.parentElement
        }
        if (!isInsideCustomElement) {
          pending.push({ node: current, state })
        }
      }

      current = walker.nextNode()
    }

    await processNodeBatch(pending, refs)
  } catch (error) {
    logger.errorWithContext('Error processing template', {}, error)
    throw error
  }
}
