// src/event-handler.ts

import { isArrowFunction } from './utils';

import type { ComponentInstance, Data, EventDefinition, Events, Refs } from './types';

const elementEventMap = new WeakMap<
  HTMLElement,
  Array<{ el: Element | Window; event: string; handler: EventListener }>
>();

export function cleanupElementAndChildren(root: Element): void {
  const stack: Element[] = [root];

  while (stack.length > 0) {
    const el = stack.pop()!;
    const typeMap = elementEventMap.get(el as HTMLElement);
    if (typeMap) {
      for (const { event, handler } of typeMap) {
        el.removeEventListener(event, handler);
      }
      elementEventMap.delete(el as HTMLElement);
    }

    // Tiefer gehen – alle Kinder pushen
    stack.push(...Array.from(el.children));
  }
}

export function cleanupAllEventsFor(componentEl: HTMLElement) {
  const entries = elementEventMap.get(componentEl);
  if (!entries) return;

  for (const { el, event, handler } of entries) {
    try {
      el.removeEventListener(event, handler);
    } catch (e) {
      console.warn('🧽 Failed to remove handler:', e);
    }
  }

  elementEventMap.delete(componentEl);
}

function registerEvent(
  componentEl: HTMLElement,
  el: Element | Window,
  event: string,
  handler: EventListener,
) {
  if (!elementEventMap.has(componentEl)) elementEventMap.set(componentEl, []);
  elementEventMap.get(componentEl)!.push({ el, event, handler });
  el.addEventListener(event, handler);
}

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

  if (typeof data[handlerName] === 'function') {
    data[handlerName](...args);
  }

  parent?.$handleEventFromChild?.(parent, data, eventName, ...args);
}

export function createSubmitHandler(handler: Function, context: Data) {
  return (event: Event) => {
    event.preventDefault();
    handler.call(context, event);
  };
}

export function createArrowHandler(handler: Function, context: Data) {
  return (event: Event) => {
    event.preventDefault();
    handler.call(context, event);
  };
}

export function createBoundHandler(
  handler: Function,
  context: any,
  eventType: string,
): (event: Event) => void {
  if (typeof handler !== 'function') {
    console.error('❌ Provided handler is not a function.', { handler, context, eventType });
    return () => {};
  }

  if (isArrowFunction(handler)) {
    return createArrowHandler(handler, context);
  }

  if (eventType === 'submit') {
    return createSubmitHandler(handler, context);
  }

  return handler.bind(context);
}

export function setupEvents(
  data: Data,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
  componentEl: HTMLElement,
): void {
  if (!Array.isArray(events)) return;

  events.forEach(([type, target, handler]) => {
    if (typeof type !== 'string' || typeof handler !== 'function') return;

    let elements: (Element | Window)[] = [];

    if (target === 'window') {
      elements = [window];
    } else if (typeof target === 'string') {
      if (target.startsWith('$refs.')) {
        const [refName, ...rest] = target.slice(6).split(' ');
        const ref = refs[refName];
        if (ref) {
          elements = rest.length ? Array.from(ref.querySelectorAll(rest.join(' '))) : [ref];
        }
      } else {
        elements = Array.from(container.querySelectorAll(target));
      }
    } else if (target instanceof Element || target instanceof Window) {
      elements = [target];
    }

    for (const el of elements) {
      const bound = createBoundHandler(handler, data, type);
      registerEvent(componentEl, el, type, bound);
    }
  });
}

export function bindNativeEvents(
  data: Data,
  fragment: DocumentFragment,
  componentEl: HTMLElement,
): void {
  const events = [
    'click',
    'input',
    'change',
    'focus',
    'blur',
    'mousedown',
    'mouseup',
    'mousemove',
    'mouseover',
    'mouseout',
    'mouseenter',
    'mouseleave',
    'dblclick',
    'contextmenu',
    'keydown',
    'keyup',
    'keypress',
    'submit',
    'reset',
    'invalid',
    'resize',
    'scroll',
    'touchstart',
    'touchend',
    'touchmove',
    'touchcancel',
    'drag',
    'dragstart',
    'dragend',
    'dragover',
    'dragenter',
    'dragleave',
    'drop',
    'play',
    'pause',
    'ended',
    'timeupdate',
    'volumechange',
    'focusin',
    'focusout',
    'wheel',
    'animationstart',
    'animationend',
    'transitionstart',
    'transitionend',
  ];

  for (const type of events) {
    for (const el of fragment.querySelectorAll(`[on${type}]`)) {
      const handlerName = el.getAttribute(`on${type}`);
      if (handlerName && typeof data[handlerName] === 'function') {
        const bound = (e: Event) => {
          e.preventDefault();
          data[handlerName](e);
        };
        el.removeAttribute(`on${type}`);
        registerEvent(componentEl, el, type, bound);
      }
    }
  }
}
