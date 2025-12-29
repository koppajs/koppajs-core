import { bindOnce } from "./utils";
import type { AnyFn, Data, Events, Methods, Refs } from "./types";

export function setupEvents(
  bindings: Data,
  events: Events,
  container: DocumentFragment,
  refs: Refs
): void {
  if (!Array.isArray(events)) return;

  events.forEach(([type, target, handler]) => {
    if (typeof type !== "string" || typeof handler !== "function") {
      console.error("❌ Provided handler is not a function.", handler);
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
      el.addEventListener(type, bindOnce(handler, bindings));
    }
  });
}

export function bindNativeEvents(
  methods: Methods,
  fragment: DocumentFragment,
  bindings: Data
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
    for (const el of fragment.querySelectorAll(`[on${type}]`)) {
      const handlerName = el.getAttribute(`on${type}`);
      if (handlerName && typeof methods[handlerName] === "function") {
        const handler = methods[handlerName] as AnyFn;
        el.removeAttribute(`on${type}`);
        el.addEventListener(type, bindOnce(handler, bindings));
      }
    }
  }
}
