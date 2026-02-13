// Canonical identity layer for DOM nodes
export const STRUCT_ID = Symbol("STRUCT_ID");
export const SLOT_ID = Symbol("SLOT_ID");

/** Internal type for objects with symbol-based identity markers */
type IdentifiableNode = {
  [STRUCT_ID]?: unknown;
  [SLOT_ID]?: unknown;
};

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
  return Object.prototype.hasOwnProperty.call(node, STRUCT_ID)
    ? (node as IdentifiableNode)[STRUCT_ID]
    : undefined;
}

export function setSlotId(node: object, id: unknown) {
  setNonEnumerableProp(node, SLOT_ID, id);
}

export function getSlotId(node: object): unknown {
  return Object.prototype.hasOwnProperty.call(node, SLOT_ID)
    ? (node as IdentifiableNode)[SLOT_ID]
    : undefined;
}
