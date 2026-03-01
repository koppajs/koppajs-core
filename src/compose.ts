import { ComposeOptions } from './types'
import { logger } from './utils/logger'

/**
 * Composes multiple objects into a single Proxy that delegates property access.
 * Properties are read from the first layer that contains them.
 * Writes go to the layer where the property exists, or to defaultWriteIndex if not found.
 * @param layers - Array of objects to compose
 * @param options - Composition options
 * @returns Proxy object that combines all layers
 * @throws Error if layers is empty or contains invalid objects
 */
export function composeBySource<T extends object[]>(
  layers: T,
  options: ComposeOptions = {},
): T[number] {
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new Error('composeBySource: layers must be a non-empty array')
  }

  if (layers.some((layer) => layer == null || typeof layer !== 'object')) {
    throw new Error('composeBySource: all layers must be objects')
  }

  const { defaultWriteIndex = layers.length - 1, includePrototype = false } = options

  const validWriteIndex =
    defaultWriteIndex >= 0 &&
    defaultWriteIndex < layers.length &&
    Number.isInteger(defaultWriteIndex)
      ? defaultWriteIndex
      : layers.length - 1

  if (defaultWriteIndex !== validWriteIndex) {
    logger.warnWithContext(
      `Invalid defaultWriteIndex ${defaultWriteIndex}, using ${validWriteIndex}`,
      { defaultWriteIndex, validWriteIndex, layersLength: layers.length },
    )
  }

  const has = (obj: object, key: PropertyKey) =>
    includePrototype ? key in obj : Object.prototype.hasOwnProperty.call(obj, key)

  const findLayerIndex = (key: PropertyKey): number => {
    for (let i = 0; i < layers.length; i++) {
      if (has(layers[i]!, key)) return i
    }
    return -1
  }

  /** Internal type for dynamic property access on composed layers */
  type LayerRecord = Record<PropertyKey, unknown>

  return new Proxy(layers[validWriteIndex] as object, {
    get(_target, prop) {
      const idx = findLayerIndex(prop)
      if (idx !== -1) return (layers[idx] as LayerRecord)[prop]
      return undefined
    },

    set(_target, prop, value) {
      const idx = findLayerIndex(prop)
      const writeTo = idx !== -1 ? idx : validWriteIndex
      ;(layers[writeTo] as LayerRecord)[prop] = value
      return true
    },

    deleteProperty(_target, prop) {
      const idx = findLayerIndex(prop)
      if (idx === -1) return true
      return delete (layers[idx] as LayerRecord)[prop]
    },

    has(_target, prop) {
      return findLayerIndex(prop) !== -1
    },

    ownKeys() {
      const keys = new Set<string | symbol>()
      for (const layer of layers) {
        Reflect.ownKeys(layer).forEach((k) => {
          if (typeof k !== 'number') keys.add(k)
        })
      }
      return Array.from(keys)
    },

    getOwnPropertyDescriptor(_target, prop) {
      for (const layer of layers) {
        const desc = Object.getOwnPropertyDescriptor(layer, prop)
        if (desc) return desc
      }
      return undefined
    },
  }) as T[number]
}
