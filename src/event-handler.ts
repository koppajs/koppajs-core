import { bindOnce, logger } from "./utils";
import type { AnyFn, State, Events, Refs, Methods } from "./types";

/**
 * Cleanup entry for a registered event listener.
 */
type EventCleanupEntry = {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
};

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
  if (!Array.isArray(events)) return () => {};

  const cleanupEntries: EventCleanupEntry[] = [];

  events.forEach(([type, target, handler]) => {
    if (typeof type !== "string" || typeof handler !== "function") {
      logger.error("Provided handler is not a function", handler);
      return;
    }

    let elements: (Element | Window)[] = [];

    if (target === "window") {
      elements = [window];
    } else if (typeof target === "string") {
      if (target.startsWith("$refs.")) {
        const [refName, ...rest] = target.slice(6).split(" ");
        const ref = refs[refName];
        if (ref) {
          elements = rest.length
            ? Array.from(ref.querySelectorAll(rest.join(" ")))
            : [ref];
        }
      } else {
        elements = Array.from(container.querySelectorAll(target));
      }
    } else if (target instanceof Element || target instanceof Window) {
      elements = [target];
    } else if (typeof target === "object" && target && "ref" in target) {
      const { ref: refName, selector } = target;
      const ref = refs[refName];
      if (ref) {
        elements = selector
          ? Array.from(ref.querySelectorAll(selector))
          : [ref];
      }
    }

    for (const el of elements) {
      // Handler is already bound if userContext is a compose object (options type)
      // For composite type, userContext === state and handler should be bound to state
      const boundHandler = bindOnce(handler, userContext);
      el.addEventListener(type, boundHandler);
      cleanupEntries.push({ target: el, type, handler: boundHandler });
    }
  });

  return () => {
    for (const { target, type, handler } of cleanupEntries) {
      target.removeEventListener(type, handler);
    }
    cleanupEntries.length = 0;
  };
}

/**
 * Regex to match event handler attributes: onClick, onclick, onMouseDown, onmousedown, etc.
 */
const EVENT_ATTR_REGEX = /^on([a-z]+)$/i;

/**
 * Binds native DOM event handlers from element attributes (e.g., onclick, oninput).
 * Walks all elements once instead of querying per event type for better performance.
 * Handlers are retrieved from userContext and assumed to be already bound (for options type).
 * @param userContext - User context containing event handlers
 * @param fragment - Document fragment to process
 */
export function bindNativeEvents(
  userContext: State,
  fragment: DocumentFragment,
): void {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;

  while (node) {
    for (const attr of Array.from(node.attributes)) {
      const match = attr.name.match(EVENT_ATTR_REGEX);
      if (match) {
        const type = match[1]!.toLowerCase();
        const handlerName = attr.value;
        if (handlerName) {
          const handler = userContext[handlerName];
          if (typeof handler === "function") {
            // Handler is already bound via bindMethods, use directly
            node.removeAttribute(attr.name);
            node.addEventListener(type, handler as AnyFn);
          }
        }
      }
    }
    node = walker.nextNode() as HTMLElement | null;
  }
}

/**
 * Binds native DOM event handlers for composite component type.
 * Walks all elements once instead of querying per event type for better performance.
 * Handlers are retrieved directly from methods object without binding.
 * @param methods - Methods object containing event handlers
 * @param fragment - Document fragment to process
 */
export function bindNativeEventsForComposite(
  methods: Methods,
  fragment: DocumentFragment,
): void {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;

  while (node) {
    for (const attr of Array.from(node.attributes)) {
      const match = attr.name.match(EVENT_ATTR_REGEX);
      if (match) {
        const type = match[1]!.toLowerCase();
        const handlerName = attr.value;
        if (handlerName) {
          const handler = methods[handlerName];
          if (typeof handler === "function") {
            // For composite type, use handler directly without binding
            node.removeAttribute(attr.name);
            node.addEventListener(type, handler);
          }
        }
      }
    }
    node = walker.nextNode() as HTMLElement | null;
  }
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
  if (!Array.isArray(events)) return () => {};

  const cleanupEntries: EventCleanupEntry[] = [];

  events.forEach(([type, target, handler]) => {
    if (typeof type !== "string" || typeof handler !== "function") {
      logger.error("Provided handler is not a function", handler);
      return;
    }

    let elements: (Element | Window)[] = [];

    if (target === "window") {
      elements = [window];
    } else if (typeof target === "string") {
      if (target.startsWith("$refs.")) {
        const [refName, ...rest] = target.slice(6).split(" ");
        const ref = refs[refName];
        if (ref) {
          elements = rest.length
            ? Array.from(ref.querySelectorAll(rest.join(" ")))
            : [ref];
        }
      } else {
        elements = Array.from(container.querySelectorAll(target));
      }
    } else if (target instanceof Element || target instanceof Window) {
      elements = [target];
    } else if (typeof target === "object" && target && "ref" in target) {
      const { ref: refName, selector } = target;
      const ref = refs[refName];
      if (ref) {
        elements = selector
          ? Array.from(ref.querySelectorAll(selector))
          : [ref];
      }
    }

    for (const el of elements) {
      // For composite type, bind handler to state (not userContext)
      const boundHandler = bindOnce(handler, state);
      el.addEventListener(type, boundHandler);
      cleanupEntries.push({ target: el, type, handler: boundHandler });
    }
  });

  return () => {
    for (const { target, type, handler } of cleanupEntries) {
      target.removeEventListener(type, handler);
    }
    cleanupEntries.length = 0;
  };
}
