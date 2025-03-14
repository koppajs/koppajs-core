// 📁 `src/utils/extend.ts`
/// <reference path="../../types.d.ts" />

import objectExtensions from './object';
import domExtensions from './dom';

export default () => {
  Object.defineProperties(Object.prototype, objectExtensions);
  Object.defineProperties(HTMLElement.prototype, domExtensions);
};
