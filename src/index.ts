// 📁 `src/index.ts`
/// <reference path="../types.d.ts" />

import Component from './Component';
import Instance from './Instance';
import { extendPrototypes } from './utils';

// Extend native prototypes with additional utility functions
extendPrototypes();

/**
 * Generates a cryptographically secure random number within a fixed range.
 * @returns {number} A secure random number between 100000 and 999999.
 */
function getSecureRandomNumber(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return 100000 + ((array[0] ?? 0) % 900000);
}

// Unique identifier used to verify singleton initialization
const identifier = getSecureRandomNumber().toString();

/**
 * Singleton class representing the core instance of Koppa.js.
 *
 * It manages modules, components, and instances within the framework.
 */
class Koppa {
  /** Stores registered modules */
  public modules: Record<string, Function | Object> = {};
  /** Stores registered components */
  public components: Record<string, Component> = {};
  /** Stores active instances */
  public instances: Record<string, Instance> = {};
  /** Holds the singleton instance of Koppa */
  private static instance: Koppa;

  /**
   * Creates or returns the singleton instance of Koppa.
   * @param {string} [input] - A verification string for controlled initialization.
   * @returns {Koppa} The singleton instance of Koppa.
   */
  constructor(input?: string) {
    if (Koppa.instance) {
      return Koppa.instance; // Return existing instance if already created
    }

    // Ensure initialization only happens with the correct identifier
    if (identifier === input) {
      this.modules = {};
      this.components = {};
      this.instances = {};
      Koppa.instance = this; // Store singleton instance
    }

    return Koppa.instance ?? this; // Fallback in case instance wasn't assigned
  }

  /**
   * Retrieves the singleton instance of Koppa.
   * @returns {Koppa} The singleton instance.
   */
  public static getInstance(): Koppa {
    return Koppa.instance ?? (Koppa.instance = new Koppa(identifier));
  }

  /**
   * Registers a module or component in Koppa.
   * @param {ComponentSource | Function} arg1 - A component definition or a module function.
   * @param {string} [arg2] - The name of the component, if applicable.
   */
  public static take(arg1: ComponentSource | Function, arg2?: string): void {
    const koppa = Koppa.getInstance();
    if (koppa.isComponentSource(arg1)) {
      koppa.components[arg2!] = new Component(arg2!, arg1);
    } else {
      koppa.modules[arg1.name] = arg1;
    }
  }

  /**
   * Checks if the given object is a valid ComponentSource.
   * @param {any} obj - The object to check.
   * @returns {boolean} `true` if the object is a ComponentSource, otherwise `false`.
   */
  private isComponentSource(obj: any): obj is ComponentSource {
    return (
      obj &&
      typeof obj.path === 'string' &&
      typeof obj.template === 'string' &&
      typeof obj.style === 'string' &&
      typeof obj.script === 'string'
    );
  }
}

// Ensure `window.koppa` always holds the singleton instance
window.koppa = Koppa.getInstance();

export default Koppa;
