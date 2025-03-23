// 📁 `src/EventHandler.ts`

import Instance from './Instance';
import { isArrowFunction } from './utils';

/**
 * Handles event propagation and event binding for an instance.
 */
export class EventHandler {
  /**
   * Creates an instance of EventHandler.
   * @param {Instance | undefined} parent - The parent instance.
   * @param {Data} data - The data object containing event handlers.
   */
  constructor(
    private parent: Instance | undefined,
    private data: Data,
  ) {}

  /**
   * Emits an event from the child component to the parent.
   * @param {string} eventName - The name of the event.
   * @param {...any} args - Arguments passed to the event handler.
   */
  public emit(eventName: string, ...args: any[]): void {
    if (this.parent) {
      this.parent.handleEventFromChild(eventName, ...args);
    }
  }

  /**
   * Handles an event propagated from a child component.
   * @param {string} eventName - The event name.
   * @param {...any} args - Arguments passed to the handler.
   */
  public handleEventFromChild(eventName: string, ...args: any[]): void {
    const handlerName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`;

    if (typeof this.data[handlerName] === 'function') {
      this.data[handlerName](...args);
    }

    if (this.parent) {
      this.parent.handleEventFromChild(eventName, ...args);
    }
  }

  /**
   * Creates a submit event handler that prevents default form submission.
   * @param {Function} handler - The function to be executed.
   * @param {Data} context - The context in which the function is executed.
   * @returns {Function} - The wrapped event handler.
   */
  private createSubmitHandler(handler: Function, context: Data) {
    return (event: Event) => {
      event.preventDefault();
      handler.call(context, event);
    };
  }

  /**
   * Creates an event handler for arrow functions.
   * @param {Function} handler - The handler function.
   * @param {Data} context - The execution context.
   * @returns {Function} - The wrapped event handler.
   */
  private createArrowHandler(handler: Function, context: Data) {
    return function (event: Event) {
      event.preventDefault();
      handler.call(context, event);
    };
  }

  /**
   * Creates a bound event handler based on the function type.
   * - If `handler` is an arrow function, it will be wrapped correctly.
   * - If `eventType` is "submit", a specialized submit handler is used.
   * - Otherwise, the handler is bound to the provided context.
   * - If `handler` is not a function, an error is logged, and a no-op function is returned.
   *
   * @param {Function} handler - The event handler function to bind.
   * @param {any} context - The execution context (usually the component or data model).
   * @param {string} eventType - The event type (e.g., "click", "submit").
   * @returns {(event: Event) => void} - The bound event handler function.
   */
  private createBoundHandler(
    handler: Function,
    context: any,
    eventType: string,
  ): (event: Event) => void {
    if (typeof handler !== 'function') {
      console.error('❌ Provided handler is not a function.', {
        handler,
        context,
        eventType,
      });
      return () => {}; // No-op function to prevent runtime errors
    }

    if (isArrowFunction(handler)) {
      return this.createArrowHandler(handler, context);
    }

    if (eventType === 'submit') {
      return this.createSubmitHandler(handler, context);
    }

    return handler.bind(context);
  }

  /**
   * Sets up event listeners on the specified container.
   * @param {Events} events - List of event definitions.
   * @param {DocumentFragment} container - The container in which to bind events.
   * @param {Refs} refs - Reference object for element lookup.
   */
  public setupEvents(events: Events, container: DocumentFragment, refs: Refs): void {
    if (!Array.isArray(events)) {
      console.error('❌ Events must be defined as an array of [eventType, target, handler].');
      return;
    }

    events.forEach((eventDefinition: EventDefinition) => {
      if (!Array.isArray(eventDefinition) || eventDefinition.length !== 3) {
        console.error(
          '❌ Each event definition must be an array: [eventType, target, handler].',
          eventDefinition,
        );
        return;
      }

      const [eventType, target, handler] = eventDefinition;

      if (typeof eventType !== 'string' || typeof handler !== 'function') {
        console.error('❌ Invalid event definition. Expected [string, target, function]:', {
          eventType,
          target,
          handler,
        });
        return;
      }

      let elements: (Element | Window)[] = [];

      try {
        if (target === 'window' || target === window) {
          elements = [window];
        } else if (typeof target === 'string') {
          if (target.startsWith('$refs.')) {
            const [refName, ...selectorParts] = target.slice(6).split(' ');
            if (refName) {
              const refElement = refs[refName];
              if (refElement) {
                elements =
                  selectorParts.length > 0
                    ? Array.from(refElement.querySelectorAll(selectorParts.join(' ')))
                    : [refElement];
              }
            }
          } else {
            elements = Array.from(container!.querySelectorAll(target));
          }
        } else if (target instanceof Element) {
          elements = [target];
        } else if (target instanceof NodeList || target instanceof HTMLCollection) {
          elements = Array.from(target).filter(
            (node): node is Element => node.nodeType === Node.ELEMENT_NODE,
          );
        } else {
          console.error('❌ Invalid target:', target);
          return;
        }

        elements.forEach((element) => {
          const boundHandler = this.createBoundHandler(handler, this.data, eventType);
          element.addEventListener(eventType, boundHandler);
        });
      } catch (error) {
        console.error(`❌ Error processing event target: "${target}"`, error);
      }
    });
  }

  /**
   * Binds native event listeners to elements with inline event attributes.
   * @param {DocumentFragment} element - The root element containing event bindings.
   */
  public bindNativeEvents(element: DocumentFragment): void {
    const supportedEvents = [
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

    supportedEvents.forEach((eventType) => {
      element.querySelectorAll(`[on${eventType}]`).forEach((el) => {
        const methodName = el.getAttribute(`on${eventType}`);

        if (methodName && this.data[methodName]) {
          el.addEventListener(eventType, (event) => {
            event.preventDefault();
            this.data[methodName](event);
          });
          el.removeAttribute(`on${eventType}`);
        } else {
          console.error(`❌ Method ${methodName} for event ${eventType} not found.`);
        }
      });
    });
  }
}
