import { objectExtensions } from './object'
import { domExtensions } from './dom'

/**
 * Extends global prototypes with KoppaJS helper utilities.
 *
 * - Object.prototype is always extended (always available in JS)
 * - HTMLElement.prototype is only extended when DOM APIs exist
 *
 * In Node/SSR environments DOM-specific extensions are skipped automatically.
 */
export const extend = () => {
  Object.defineProperties(Object.prototype, objectExtensions)

  if (typeof HTMLElement !== 'undefined') {
    Object.defineProperties(HTMLElement.prototype, domExtensions)
  }
}
