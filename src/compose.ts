import { ComposeOptions } from "./types";

export function composeBySource<T extends object[]>(
  layers: T,
  options: ComposeOptions = {}
): T[number] {
  const { defaultWriteIndex = layers.length - 1, includePrototype = false } =
    options;

  const has = (obj: object, key: PropertyKey) =>
    includePrototype
      ? key in obj
      : Object.prototype.hasOwnProperty.call(obj, key);

  const findLayerIndex = (key: PropertyKey): number => {
    for (let i = 0; i < layers.length; i++) {
      if (has(layers[i]!, key)) return i;
    }
    return -1;
  };

  return new Proxy(layers[defaultWriteIndex] as object, {
    get(_target, prop) {
      const idx = findLayerIndex(prop);
      if (idx !== -1) return (layers[idx] as any)[prop];
      return undefined;
    },

    set(_target, prop, value) {
      const idx = findLayerIndex(prop);
      const writeTo = idx !== -1 ? idx : defaultWriteIndex;
      (layers[writeTo] as any)[prop] = value;
      return true;
    },

    deleteProperty(_target, prop) {
      const idx = findLayerIndex(prop);
      if (idx === -1) return true;
      return delete (layers[idx] as any)[prop];
    },

    has(_target, prop) {
      return findLayerIndex(prop) !== -1;
    },

    ownKeys() {
      const keys = new Set<string | symbol>();
      for (const layer of layers) {
        Reflect.ownKeys(layer).forEach((k) => {
          if (typeof k !== "number") keys.add(k);
        });
      }
      return Array.from(keys);
    },

    getOwnPropertyDescriptor(_target, prop) {
      for (const layer of layers) {
        const desc = Object.getOwnPropertyDescriptor(layer, prop);
        if (desc) return desc;
      }
      return undefined;
    },
  }) as any;
}
