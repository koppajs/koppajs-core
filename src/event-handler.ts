import { isArrowFunction } from "./utils";
import type { AnyFn, ComponentInstance, Data, Events, Refs } from "./types";

export function emit(
  parent: ComponentInstance | undefined,
  eventName: string,
  ...args: any[]
): void {
  parent?.$handleEventFromChild?.(parent, parent?.data, eventName, ...args);
}

export function handleEventFromChild(
  parent: ComponentInstance | undefined,
  data: Data,
  eventName: string,
  ...args: any[]
): void {
  const handlerName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;

  if (typeof data[handlerName] === "function") {
    data[handlerName](...args);
  }

  parent?.$handleEventFromChild?.(parent, data, eventName, ...args);
}

export function createSubmitHandler(handler: AnyFn, context: Data) {
  return (event: Event) => {
    event.preventDefault();
    handler.call(context, event);
  };
}

export function createArrowHandler(handler: AnyFn, context: Data) {
  return (event: Event) => {
    event.preventDefault();
    handler.call(context, event);
  };
}

export function createBoundHandler(
  handler: AnyFn,
  context: any,
  eventType: string,
): (event: Event) => void {
  if (typeof handler !== "function") {
    console.error("❌ Provided handler is not a function.", {
      handler,
      context,
      eventType,
    });
    return () => {};
  }

  if (isArrowFunction(handler)) {
    return createArrowHandler(handler, context);
  }

  if (eventType === "submit") {
    return createSubmitHandler(handler, context);
  }

  return handler.bind(context);
}

export function setupEvents(
  data: Data,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): void {
  if (!Array.isArray(events)) return;

  events.forEach(([type, target, handler]) => {
    if (typeof type !== "string" || typeof handler !== "function") return;

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
      const bound = createBoundHandler(handler, data, type);
      el.addEventListener(type, bound);
    }
  });
}

export function bindNativeEvents(data: Data, fragment: DocumentFragment): void {
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
    for (const el of fragment.querySelectorAll(`[on${type}]`)) {
      const handlerName = el.getAttribute(`on${type}`);
      if (handlerName && typeof data[handlerName] === "function") {
        const bound = (e: Event) => {
          e.preventDefault();
          data[handlerName](e);
        };
        el.removeAttribute(`on${type}`);
        el.addEventListener(type, bound);
      }
    }
  }
}
