const EVENT_REGISTRY = new WeakMap<EventTarget, Set<EventListenerEntry>>()

type EventListenerEntry = {
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
}

let observer: MutationObserver | undefined

/** Internal type for tracking patching status on globalThis */
interface KoppajsGlobalThis {
  __koppajsEventTrackingPatched?: boolean
}

/**
 * Patches EventTarget.prototype.addEventListener/removeEventListener
 * to globally track registered listeners.
 *
 * This only runs when EventTarget exists (browser/JSDOM).
 * In Node/SSR it is a safe no-op.
 */
export function patchGlobalEventTracking(): void {
  if (typeof EventTarget === 'undefined') return

  const g = globalThis as KoppajsGlobalThis

  if (g.__koppajsEventTrackingPatched) return
  g.__koppajsEventTrackingPatched = true

  const nativeAdd = EventTarget.prototype.addEventListener
  const nativeRemove = EventTarget.prototype.removeEventListener

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!EVENT_REGISTRY.has(this)) {
      EVENT_REGISTRY.set(this, new Set())
    }

    EVENT_REGISTRY.get(this)!.add({ type, listener, options })
    return nativeAdd.call(this, type, listener, options)
  }

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const entries = EVENT_REGISTRY.get(this)
    if (entries) {
      for (const entry of entries) {
        if (entry.type === type && entry.listener === listener) {
          entries.delete(entry)
          break
        }
      }
      if (entries.size === 0) {
        EVENT_REGISTRY.delete(this)
      }
    }

    return nativeRemove.call(this, type, listener, options)
  }
}

/**
 * Removes all listeners registered on a specific EventTarget.
 */
export function cleanupAllEventListeners(target: EventTarget): void {
  const entries = EVENT_REGISTRY.get(target)
  if (!entries) return

  for (const { type, listener, options } of entries) {
    target.removeEventListener(type, listener, options)
  }

  EVENT_REGISTRY.delete(target)
}

/**
 * Recursively cleans up all event listeners in a DOM subtree.
 * This is only active in environments where DOM APIs exist.
 */
export function cleanupSubtree(root: Node): void {
  if (
    typeof document === 'undefined' ||
    typeof NodeFilter === 'undefined' ||
    typeof Element === 'undefined'
  ) {
    return
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node: Element | null = root instanceof Element ? root : null

  while (node) {
    if (EVENT_REGISTRY.has(node)) {
      cleanupAllEventListeners(node)
    }
    node = walker.nextNode() as Element | null
  }
}

/**
 * Starts a global MutationObserver that automatically cleans up
 * event listeners from removed DOM elements.
 *
 * In SSR/Node environments this function is a safe no-op.
 */
export function startGlobalDisconnectionObserver(): void {
  if (observer) return
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  if (!document.body) return

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((removedNode) => {
        if (removedNode.nodeType !== Node.ELEMENT_NODE) return
        cleanupSubtree(removedNode)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

/**
 * Stops the global observer (useful in tests).
 */
export function stopGlobalDisconnectionObserver(): void {
  if (!observer) return
  observer.disconnect()
  observer = undefined
}
