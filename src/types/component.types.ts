import type { ComponentSource, Props } from '../types';

export declare function processSlots({
  container,
  host,
}: {
  container: DocumentFragment;
  host: HTMLElement;
}): void;

export declare function validateProp({
  propName,
  propValue,
  props,
}: {
  propName: string;
  propValue: any;
  props: Props;
}): boolean;

export declare function registerComponent(componentName: string, source: ComponentSource): void;
