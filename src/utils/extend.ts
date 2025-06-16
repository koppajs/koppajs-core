// src/utils/extend.ts

import { objectExtensions } from './object';
import { domExtensions } from './dom';

export const extend = () => {
  Object.defineProperties(Object.prototype, objectExtensions);
  Object.defineProperties(HTMLElement.prototype, domExtensions);
};
