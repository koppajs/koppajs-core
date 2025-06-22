// global-event-cleaner.ts

const EVENT_REGISTRY = new WeakMap<EventTarget, Set<EventListenerEntry>>();

type EventListenerEntry = {
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

let observer: MutationObserver | undefined = undefined;

/**
 * Globale Erweiterung von addEventListener/removeEventListener
 * mit automatischer Registrierung.
 */
export function patchGlobalEventTracking() {
  if ((window as any).__eventTrackingPatched) return;
  (window as any).__eventTrackingPatched = true;

  const nativeAdd = EventTarget.prototype.addEventListener;
  const nativeRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!EVENT_REGISTRY.has(this)) EVENT_REGISTRY.set(this, new Set());
    EVENT_REGISTRY.get(this)!.add({ type, listener, options });
    return nativeAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const set = EVENT_REGISTRY.get(this);
    if (set) {
      for (const entry of set) {
        if (entry.type === type && entry.listener === listener) {
          set.delete(entry);
          break;
        }
      }
    }
    return nativeRemove.call(this, type, listener, options);
  };
}

/**
 * Entfernt alle registrierten Event-Handler von einem Element.
 */
export function cleanupAllEventListeners(target: EventTarget) {
  const entries = EVENT_REGISTRY.get(target);
  if (!entries) return;
  for (const { type, listener, options } of entries) {
    target.removeEventListener(type, listener, options);
  }
  EVENT_REGISTRY.delete(target);
}

/**
 * Rekursiver Cleanup über den gesamten DOM-Subtree.
 */
export function cleanupSubtree(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Element | null = root instanceof Element ? root : null;

  while (node) {
    if (EVENT_REGISTRY.has(node)) {
      cleanupAllEventListeners(node);
    }
    node = walker.nextNode() as Element | null;
  }
}

/**
 * Startet einen globalen Observer für entfernte DOM-Knoten.
 * Führt automatisches Event-Cleanup aus.
 */
export function startGlobalDisconnectionObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode.nodeType !== Node.ELEMENT_NODE) continue;
        cleanupSubtree(removedNode);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Stoppt den globalen Observer (z. B. bei Tests).
 */
export function stopGlobalDisconnectionObserver() {
  observer?.disconnect();
  observer = undefined;
}
