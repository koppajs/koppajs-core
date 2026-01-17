// Canonical identity layer for DOM nodes
export const STRUCT_ID = Symbol('STRUCT_ID');
export const SLOT_ID = Symbol('SLOT_ID');

function setNonEnumerableProp(node: object, key: symbol, value: unknown) {
  Object.defineProperty(node, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

export function setStructId(node: object, id: unknown) {
  setNonEnumerableProp(node, STRUCT_ID, id);
}

export function getStructId(node: object): unknown {
  return Object.prototype.hasOwnProperty.call(node, STRUCT_ID) ? (node as any)[STRUCT_ID] : undefined;
}

export function setSlotId(node: object, id: unknown) {
  setNonEnumerableProp(node, SLOT_ID, id);
}

export function getSlotId(node: object): unknown {
  return Object.prototype.hasOwnProperty.call(node, SLOT_ID) ? (node as any)[SLOT_ID] : undefined;
}
