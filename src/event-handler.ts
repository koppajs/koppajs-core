import { bindOnce, logger } from "./utils";
import type { AnyFn, State, Events, Refs, Methods } from "./types";

/**
 * Sets up custom event listeners for component events.
 * Handles window events, selector-based events, and ref-based events.
 * @param userContext - User context to bind handlers to
 * @param events - Array of event definitions
 * @param container - Document fragment to query selectors from
 * @param refs - Component element references
 */
export function setupEvents(
  userContext: State,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): void {
  if (!Array.isArray(events)) return;

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
    }
  });
}

/**
 * Binds native DOM event handlers from element attributes (e.g., onclick, oninput).
 * Handlers are retrieved from userContext and assumed to be already bound (for options type).
 * @param userContext - User context containing event handlers
 * @param fragment - Document fragment to process
 */
export function bindNativeEvents(
  userContext: State,
  fragment: DocumentFragment,
): void {
  const events = [
    "click",
    "input",
    "change",
    "focus",
    "blur",
    "mousedown",
    "mouseup",
    "mousemove",
    "mouseover",
    "mouseout",
    "mouseenter",
    "mouseleave",
    "dblclick",
    "contextmenu",
    "keydown",
    "keyup",
    "keypress",
    "submit",
    "reset",
    "invalid",
    "resize",
    "scroll",
    "touchstart",
    "touchend",
    "touchmove",
    "touchcancel",
    "drag",
    "dragstart",
    "dragend",
    "dragover",
    "dragenter",
    "dragleave",
    "drop",
    "play",
    "pause",
    "ended",
    "timeupdate",
    "volumechange",
    "focusin",
    "focusout",
    "wheel",
    "animationstart",
    "animationend",
    "transitionstart",
    "transitionend",
  ];

  for (const type of events) {
    // Support both lowercase (onclick) and camelCase (onClick) attribute names
    const camelCase = `on${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    const lowerCase = `on${type}`;

    for (const attrName of [camelCase, lowerCase]) {
      for (const el of fragment.querySelectorAll(`[${attrName}]`)) {
        const handlerName = el.getAttribute(attrName);
        if (handlerName) {
          const handler = userContext[handlerName];
          if (typeof handler === "function") {
            // Handler is already bound via bindMethods, use directly
            el.removeAttribute(attrName);
            el.addEventListener(type, handler as AnyFn);
          }
        }
      }
    }
  }
}

/**
 * Binds native DOM event handlers for composite component type.
 * Handlers are retrieved directly from methods object without binding.
 * @param methods - Methods object containing event handlers
 * @param fragment - Document fragment to process
 */
export function bindNativeEventsForComposite(
  methods: Methods,
  fragment: DocumentFragment,
): void {
  const events = [
    "click",
    "input",
    "change",
    "focus",
    "blur",
    "mousedown",
    "mouseup",
    "mousemove",
    "mouseover",
    "mouseout",
    "mouseenter",
    "mouseleave",
    "dblclick",
    "contextmenu",
    "keydown",
    "keyup",
    "keypress",
    "submit",
    "reset",
    "invalid",
    "resize",
    "scroll",
    "touchstart",
    "touchend",
    "touchmove",
    "touchcancel",
    "drag",
    "dragstart",
    "dragend",
    "dragover",
    "dragenter",
    "dragleave",
    "drop",
    "play",
    "pause",
    "ended",
    "timeupdate",
    "volumechange",
    "focusin",
    "focusout",
    "wheel",
    "animationstart",
    "animationend",
    "transitionstart",
    "transitionend",
  ];

  for (const type of events) {
    // Support both lowercase (onclick) and camelCase (onClick) attribute names
    const camelCase = `on${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    const lowerCase = `on${type}`;

    for (const attrName of [camelCase, lowerCase]) {
      for (const el of fragment.querySelectorAll(`[${attrName}]`)) {
        const handlerName = el.getAttribute(attrName);
        if (handlerName) {
          const handler = methods[handlerName];
          if (typeof handler === "function") {
            // For composite type, use handler directly without binding
            el.removeAttribute(attrName);
            el.addEventListener(type, handler);
          }
        }
      }
    }
  }
}

/**
 * Sets up custom event listeners for composite component type.
 * Handlers are bound to state using bindOnce.
 * @param methods - Methods object (unused, kept for signature consistency)
 * @param state - Component state to bind handlers to
 * @param events - Array of event definitions
 * @param container - Document fragment to query selectors from
 * @param refs - Component element references
 */
export function setupEventsForComposite(
  methods: Methods,
  state: State,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): void {
  if (!Array.isArray(events)) return;

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
    }
  });
}
