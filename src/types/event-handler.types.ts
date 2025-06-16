import type { ComponentInstance, Data, Event, Events, Function, Refs } from '../types';

export declare function emit(
  parent: ComponentInstance | undefined,
  eventName: string,
  ...args: any[]
): void;

export declare function handleEventFromChild(
  parent: ComponentInstance | undefined,
  data: Data,
  eventName: string,
  ...args: any[]
): void;

export declare function createSubmitHandler(
  handler: Function,
  context: Data,
): (event: Event) => void;

export declare function createArrowHandler(
  handler: Function,
  context: Data,
): (event: Event) => void;

export declare function createBoundHandler(
  handler: Function,
  context: any,
  eventType: string,
): (event: Event) => void;

export declare function setupEvents(
  data: Data,
  events: Events,
  container: DocumentFragment,
  refs: Refs,
): void;

export declare function bindNativeEvents(data: Data, fragment: DocumentFragment): void;
