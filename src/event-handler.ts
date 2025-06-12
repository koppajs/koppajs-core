// src/event-handler.ts

import { isArrowFunction } from './utils';

import type { ComponentInstance, Data, EventDefinition, Events, Refs } from './types';

export function emit(
  parent: ComponentInstance | undefined,
  eventName: string,
  ...args: any[]
): void {
  const fn = parent?.$handleEventFromChild as ((e: string, ...a: any[]) => void) | undefined;
  if (fn) fn(eventName, ...args);
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

  const fn = parent?.$handleEventFromChild as ((e: string, ...a: any[]) => void) | undefined;
  if (fn) fn(eventName, ...args);
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
): void {
  if (!Array.isArray(events)) {
    console.error('❌ Events must be defined as an array of [eventType, target, handler].');
    return;
  }

  events.forEach((eventDefinition: EventDefinition) => {
    if (!Array.isArray(eventDefinition) || eventDefinition.length !== 3) {
      console.error('❌ Each event definition must be [type, target, handler].', eventDefinition);
      return;
    }

    const [eventType, target, handler] = eventDefinition;

    if (typeof eventType !== 'string' || typeof handler !== 'function') {
      console.error('❌ Invalid event definition.', { eventType, target, handler });
      return;
    }

    let elements: (Element | Window)[] = [];

    try {
      if (target === 'window' || target === window) {
        elements = [window];
      } else if (typeof target === 'string') {
        if (target.startsWith('$refs.')) {
          const [refName, ...selectorParts] = target.slice(6).split(' ');
          const ref = refs[refName as string];
          if (ref) {
            elements = selectorParts.length
              ? Array.from(ref.querySelectorAll(selectorParts.join(' ')))
              : [ref];
          }
        } else {
          elements = Array.from(container.querySelectorAll(target));
        }
      } else if (target instanceof Element) {
        elements = [target];
      } else if (target instanceof NodeList || target instanceof HTMLCollection) {
        elements = Array.from(target).filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE);
      } else {
        console.error('❌ Invalid event target:', target);
        return;
      }

      elements.forEach((el) => {
        const bound = createBoundHandler(handler, data, eventType);
        el.addEventListener(eventType, bound);
      });
    } catch (err) {
      console.error(`❌ Error binding event "${eventType}" on`, target, err);
    }
  });
}

export function bindNativeEvents(data: Data, fragment: DocumentFragment): void {
  const supported = [
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

  supported.forEach((eventType) => {
    fragment.querySelectorAll(`[on${eventType}]`).forEach((el) => {
      const name = el.getAttribute(`on${eventType}`);
      if (name && data[name]) {
        el.addEventListener(eventType, (e) => {
          e.preventDefault();
          data[name](e);
        });
        el.removeAttribute(`on${eventType}`);
      } else {
        console.error(`❌ Method ${name} for event ${eventType} not found.`);
      }
    });
  });
}
