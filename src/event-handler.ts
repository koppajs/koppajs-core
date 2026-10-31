import { bindOnce, logger } from './utils'
import type { State, Events, Refs, Methods } from './types'

/**
 * Cleanup entry for a registered event listener.
 */
type EventCleanupEntry = {
  target: EventTarget
  type: string
  handler: EventListenerOrEventListenerObject
}

/**
 * Sets up custom event listeners for component events.
 * Handles window events, selector-based events, and ref-based events.
 * Returns a cleanup function that removes all listeners added by this call.
 * @param userContext - User context to bind handlers to
 * @param events - Array of event definitions
 * @param container - Document fragment to query selectors from
 * @param refs - Component element references
 * @returns Cleanup function that removes all listeners added by this call
 */
export function setupEvents(
  userContext: State,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): () => void {
  if (!Array.isArray(events)) return () => {}

  const cleanupEntries: EventCleanupEntry[] = []

  events.forEach(([type, target, handler]) => {
    if (typeof type !== 'string' || typeof handler !== 'function') {
      logger.error('Provided handler is not a function', handler)
      return
    }

    let elements: (Element | Window)[] = []

    if (target === 'window') {
      elements = [window]
    } else if (typeof target === 'string') {
      if (target.startsWith('$refs.')) {
        const [refName, ...rest] = target.slice(6).split(' ')
        const ref = refs[refName]
        if (ref) {
          elements = rest.length
            ? Array.from(ref.querySelectorAll(rest.join(' ')))
            : [ref]
        }
      } else {
        elements = Array.from(container.querySelectorAll(target))
      }
    } else if (target instanceof Element || target instanceof Window) {
      elements = [target]
    } else if (typeof target === 'object' && target && 'ref' in target) {
      const { ref: refName, selector } = target
      const ref = refs[refName]
      if (ref) {
        elements = selector ? Array.from(ref.querySelectorAll(selector)) : [ref]
      }
    }

    for (const el of elements) {
      // Handler is already bound if userContext is a compose object (options type)
      // For composite type, userContext === state and handler should be bound to state
      const boundHandler = bindOnce(handler, userContext)
      el.addEventListener(type, boundHandler)
      cleanupEntries.push({ target: el, type, handler: boundHandler })
    }
  })

  return () => {
    for (const { target, type, handler } of cleanupEntries) {
      target.removeEventListener(type, handler)
    }
    cleanupEntries.length = 0
  }
}

/**
 * Regex to match event handler attributes: onClick, onclick, onMouseDown, onmousedown, etc.
 */
const EVENT_ATTR_REGEX = /^on([a-z]+)$/i

type NativeEventBinding = {
  handlerName: string
  handler?: WeakRef<EventListener>
}

// Caller-owned slot nodes survive teardown, but their consumed attributes do not.
const nativeEventBindings = new WeakMap<HTMLElement, Map<string, NativeEventBinding>>()

function bindNativeEventHandlers(
  context: State | Methods,
  fragment: DocumentFragment,
): void {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      // Parent bindings may target a custom host, never its child-owned template.
      let parent = node.parentElement
      while (parent) {
        if (parent.tagName.includes('-')) return NodeFilter.FILTER_REJECT
        parent = parent.parentElement
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let node = walker.nextNode() as HTMLElement | null

  while (node) {
    let bindings = nativeEventBindings.get(node)
    for (const attr of Array.from(node.attributes)) {
      const match = attr.name.match(EVENT_ATTR_REGEX)
      if (!match || !attr.value || typeof context[attr.value] !== 'function') continue

      const type = match[1]!.toLowerCase()
      if (!bindings) {
        bindings = new Map()
        nativeEventBindings.set(node, bindings)
      }
      const previous = bindings.get(type)?.handler?.deref()
      if (previous) node.removeEventListener(type, previous)
      bindings.set(type, { handlerName: attr.value })
      node.removeAttribute(attr.name)
    }

    if (bindings) {
      for (const [type, binding] of bindings) {
        const previous = binding.handler?.deref()
        if (previous) node.removeEventListener(type, previous)
        const handler = context[binding.handlerName]
        binding.handler = undefined
        if (typeof handler === 'function') {
          // Do not retain torn-down controller closures on surviving slot nodes.
          binding.handler = new WeakRef(handler as EventListener)
          // Re-add even an unchanged handler: subtree cleanup may have removed it.
          node.addEventListener(type, handler as EventListener)
        }
      }
    }
    node = walker.nextNode() as HTMLElement | null
  }
}

/** Binds consumed declarative handlers to the current options context. */
export function bindNativeEvents(userContext: State, fragment: DocumentFragment): void {
  bindNativeEventHandlers(userContext, fragment)
}

/** Binds consumed declarative handlers without implicit composite context binding. */
export function bindNativeEventsForComposite(
  methods: Methods,
  fragment: DocumentFragment,
): void {
  bindNativeEventHandlers(methods, fragment)
}

/**
 * Sets up custom event listeners for composite component type.
 * Handlers are bound to state using bindOnce.
 * Returns a cleanup function that removes all listeners added by this call.
 * @param methods - Methods object (unused, kept for signature consistency)
 * @param state - Component state to bind handlers to
 * @param events - Array of event definitions
 * @param container - Document fragment to query selectors from
 * @param refs - Component element references
 * @returns Cleanup function that removes all listeners added by this call
 */
export function setupEventsForComposite(
  methods: Methods,
  state: State,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): () => void {
  if (!Array.isArray(events)) return () => {}

  const cleanupEntries: EventCleanupEntry[] = []

  events.forEach(([type, target, handler]) => {
    if (typeof type !== 'string' || typeof handler !== 'function') {
      logger.error('Provided handler is not a function', handler)
      return
    }

    let elements: (Element | Window)[] = []

    if (target === 'window') {
      elements = [window]
    } else if (typeof target === 'string') {
      if (target.startsWith('$refs.')) {
        const [refName, ...rest] = target.slice(6).split(' ')
        const ref = refs[refName]
        if (ref) {
          elements = rest.length
            ? Array.from(ref.querySelectorAll(rest.join(' ')))
            : [ref]
        }
      } else {
        elements = Array.from(container.querySelectorAll(target))
      }
    } else if (target instanceof Element || target instanceof Window) {
      elements = [target]
    } else if (typeof target === 'object' && target && 'ref' in target) {
      const { ref: refName, selector } = target
      const ref = refs[refName]
      if (ref) {
        elements = selector ? Array.from(ref.querySelectorAll(selector)) : [ref]
      }
    }

    for (const el of elements) {
      // For composite type, bind handler to state (not userContext)
      const boundHandler = bindOnce(handler, state)
      el.addEventListener(type, boundHandler)
      cleanupEntries.push({ target: el, type, handler: boundHandler })
    }
  })

  return () => {
    for (const { target, type, handler } of cleanupEntries) {
      target.removeEventListener(type, handler)
    }
    cleanupEntries.length = 0
  }
}
