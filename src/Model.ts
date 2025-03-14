// 📁 `src/Model.ts`
/// <reference path="../types.d.ts" />

/**
 * Type definition for a callback function triggered when a value changes.
 * @callback Callback
 * @param {any} [oldValue] - The previous value before the change.
 * @param {any} [newValue] - The new value after the change.
 */
type Callback = (oldValue?: any, newValue?: any) => void;

/**
 * Symbol to identify whether an object is a Proxy.
 */
const IS_PROXY = Symbol('isProxy');

// Define the IS_PROXY property on the Proxy object for identification purposes.
Object.defineProperty(Proxy, IS_PROXY, {
  value: true,
  enumerable: false,
});

/**
 * A reactive model class utilizing Proxy to track changes to object properties.
 * @template T - Type of the model data.
 */
export class Model<T extends Record<string, any>> {
  private callback: Callback; // Callback invoked when a value changes.
  private observers: Set<() => void> = new Set(); // Set of registered observer functions.
  private watchList: Map<object, Set<string>>; // Tracks properties being watched.
  public data: T; // Reactive data model.
  private proxyCache = new WeakMap<object, object>(); // Cache for Proxy objects.

  [key: string]: any; // Allow dynamic properties

  /**
   * Constructs the reactive model.
   * @param {T} modelData - Initial data for the model.
   * @param {Callback} callback - Function to handle value changes.
   */
  constructor(modelData: T, callback: Callback) {
    this.callback = (oldValue, newValue) => {
      callback(oldValue, newValue); // Execute user-provided callback.
      this.notifyObservers(); // Notify all registered observers.
    };
    this.watchList = new Map();
    this.data = this.makeReactive(modelData);
    return this;
  }

  /**
   * Adds an observer function to be called on changes.
   * @param {() => void} observer - Observer function to register.
   */
  public addObserver(observer: () => void): void {
    this.observers.add(observer);
  }

  /**
   * Removes an observer function from the notification list.
   * @param {() => void} observer - Observer function to remove.
   */
  public removeObserver(observer: () => void): void {
    this.observers.delete(observer);
  }

  /**
   * Notifies all registered observers about changes.
   */
  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer(); // Execute each observer function.
    }
  }

  /**
   * Checks whether an object is a Proxy created by this class.
   * @param {any} obj - The object to check.
   * @returns {boolean} - True if the object is a Proxy, otherwise false.
   */
  private isProxy(obj: any): boolean {
    return !!obj && typeof obj === 'object' && Reflect.get(obj, IS_PROXY);
  }

  /**
   * Determines if a value is a primitive type.
   * @param {any} value - Value to check.
   * @returns {boolean} - True if the value is primitive, otherwise false.
   */
  private isPrimitive(value: any): boolean {
    return (
      value !== null &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'function' ||
        typeof value === 'undefined')
    );
  }

  /**
   * Checks if a specific property or value exists in the watch list.
   * @param {object} [parentObj] - Parent object to check.
   * @param {string} [property] - Property name to check.
   * @param {any} [value] - Value to check for watch registration.
   * @returns {boolean} - True if the property or value is watched, otherwise false.
   */
  private hasWatchEntry(parentObj?: object, property?: string, value?: any): boolean {
    if (parentObj && property) {
      const watchedProperties = this.watchList.get(parentObj);
      return watchedProperties?.has(property) || false;
    }

    if (value !== undefined) {
      for (const [parent, props] of this.watchList.entries()) {
        for (const prop of props) {
          if (Reflect.get(parent, prop) === value) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Checks if a specific property of an object is being watched.
   * @param {object} parent - The parent object.
   * @param {string} property - The property to check.
   * @returns {boolean} - True if the property is being watched, otherwise false.
   */
  private isWatched(parent: object, property: string): boolean {
    return this.hasWatchEntry(parent, property);
  }

  /**
   * Checks if a value as a whole is being watched.
   * @param {any} value - The value to check.
   * @returns {boolean} - True if the value is watched, otherwise false.
   */
  private isWholeValueWatched(value: any): boolean {
    return this.hasWatchEntry(undefined, undefined, value);
  }

  /**
   * Wraps an object in a Proxy to make it reactive.
   * @param {any} obj - The object to make reactive.
   * @returns {any} - The reactive proxy object.
   */
  private makeReactive(obj: any): any {
    if (obj !== null && typeof obj === 'object') {
      if (this.proxyCache.has(obj)) {
        return this.proxyCache.get(obj);
      }

      const proxy = new Proxy(obj, {
        get: (target, property, receiver) => {
          if (property === IS_PROXY) {
            return true; // Indicates the object is a Proxy.
          }
          return Reflect.get(target, property, receiver);
        },

        set: (target, property, value, receiver) => {
          const oldValue = Reflect.get(target, property, receiver);
          if (oldValue === value) {
            return true; // No changes, skip further processing.
          }
          const isWatchedProperty = this.isWatched(target, property.toString());

          // Handle special cases for arrays and objects.
          if (
            isWatchedProperty &&
            Array.isArray(oldValue) &&
            !this.isPrimitive(value) &&
            Array.isArray(value) &&
            this.isWholeValueWatched(oldValue)
          ) {
            this.diffArraysOptimized(oldValue, value);
            return true;
          }

          if (
            isWatchedProperty &&
            oldValue &&
            typeof oldValue === 'object' &&
            this.isProxy(oldValue) &&
            value &&
            typeof value === 'object' &&
            !this.isProxy(value)
          ) {
            this.mergeInPlaceObject(oldValue, value);
            if (oldValue !== value) {
              this.callback(oldValue, value);
              let finalVal = value;
              if (finalVal && typeof finalVal === 'object' && !this.isProxy(finalVal)) {
                finalVal = this.makeReactive(finalVal);
              }
              Reflect.set(target, property, finalVal, receiver);
            }
            return true;
          }

          // Standard property assignment.
          const result = Reflect.set(target, property, value, receiver);
          if (isWatchedProperty && oldValue !== value) {
            if (value && typeof value === 'object' && !this.isProxy(value)) {
              value = this.makeReactive(value);
              Reflect.set(target, property, value, receiver);
            }
            this.callback(oldValue, value);
          }
          return result;
        },

        deleteProperty: (target, property) => {
          const propName = property.toString();
          const oldValue = Reflect.get(target, property);
          const isWatchedProperty = this.isWatched(target, propName);

          const isDeleted = Reflect.deleteProperty(target, property);

          if (isWatchedProperty && oldValue !== undefined) {
            this.callback(oldValue, undefined);
          }

          return isDeleted;
        },
      });

      this.proxyCache.set(obj, proxy);

      return proxy;
    }

    return obj; // Return unchanged for primitive values.
  }

  /**
   * Merges properties from a new object into an existing object in place.
   * Any properties in the old object that are not present in the new object
   * are removed. Shared properties are updated if their values differ.
   * @param {object} oldObj - The existing object to update.
   * @param {object} newObj - The new object containing updated properties.
   */
  private mergeInPlaceObject(oldObj: any, newObj: any): void {
    if (oldObj === newObj) {
      return; // No action needed if both objects are identical.
    }

    // Remove properties in the old object that are not in the new object.
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        const oldVal = oldObj[key];
        if (this.isWatched(oldObj, key)) {
          this.callback(oldVal, undefined);
        }
        Reflect.deleteProperty(oldObj, key);
      }
    }

    // Add or update properties from the new object to the old object.
    for (const key of Object.keys(newObj)) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      if (oldVal !== newVal) {
        if (
          oldVal &&
          typeof oldVal === 'object' &&
          this.isProxy(oldVal) &&
          newVal &&
          typeof newVal === 'object' &&
          !this.isProxy(newVal)
        ) {
          // Merge nested objects recursively.
          this.mergeInPlaceObject(oldVal, newVal);
          if (oldVal !== newVal) {
            if (this.isWatched(oldObj, key)) {
              this.callback(oldVal, newVal);
            }
            Reflect.set(oldObj, key, newVal);
          }
        } else {
          if (this.isWatched(oldObj, key)) {
            this.callback(oldVal, newVal);
          }
          Reflect.set(oldObj, key, newVal);
        }
      }
    }
  }

  /**
   * Performs a diff operation between two arrays, triggering callbacks for
   * elements that are added or removed. Uses reference equality for comparison.
   * @param {any[]} oldArr - The original array.
   * @param {any[]} newArr - The updated array.
   */
  private diffArraysByReferenceNoDeepMerge(oldArr: any[], newArr: any[]): void {
    if (oldArr === newArr) {
      return; // No action needed if arrays are identical.
    }

    // Find the Longest Common Subsequence (LCS) between the arrays.
    const lcsPairs = this.findLCSByRef(oldArr, newArr);

    let i = 0,
      j = 0,
      pairIndex = 0;

    // Process elements not in the LCS.
    while (pairIndex < lcsPairs.length || i < oldArr.length || j < newArr.length) {
      const [lcsI, lcsJ] =
        pairIndex < lcsPairs.length ? lcsPairs[pairIndex]! : [oldArr.length, newArr.length];

      while (i < lcsI) {
        this.callback(oldArr[i], undefined); // Removed elements.
        i++;
      }

      while (j < lcsJ) {
        this.callback(undefined, newArr[j]); // Added elements.
        j++;
      }

      if (pairIndex < lcsPairs.length) {
        i = lcsI + 1;
        j = lcsJ + 1;
        pairIndex++;
      }
    }

    // Update the old array with the new array's contents.
    oldArr.splice(0, oldArr.length, ...newArr);
  }

  /**
   * Finds the Longest Common Subsequence (LCS) between two arrays using reference equality.
   * @param {any[]} oldArr - The original array.
   * @param {any[]} newArr - The updated array.
   * @returns {[number, number][]} - Array of index pairs representing the LCS.
   */
  private findLCSByRef(oldArr: any[], newArr: any[]): [number, number][] {
    const lenA = oldArr.length;
    const lenB = newArr.length;

    const dp: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        if (oldArr[i - 1] === newArr[j - 1]) {
          dp[i]![j]! = dp[i - 1]![j - 1]! + 1;
        } else {
          dp[i]![j]! = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
        }
      }
    }

    const result: [number, number][] = [];
    let i = lenA,
      j = lenB;
    while (i > 0 && j > 0) {
      if (oldArr[i - 1] === newArr[j - 1]) {
        result.unshift([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
        i--;
      } else {
        j--;
      }
    }
    return result;
  }

  /**
   * Optimized diff operation for arrays, determining whether to handle changes
   * by simple addition/removal or more detailed analysis.
   * @param {any[]} oldArr - The original array.
   * @param {any[]} newArr - The updated array.
   */
  private diffArraysOptimized(oldArr: any[], newArr: any[]): void {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    // Check if the arrays differ only by additions/removals.
    const onlyAddedOrRemoved =
      oldArr.length !== newArr.length ||
      [...oldSet].some((item) => !newSet.has(item)) ||
      [...newSet].some((item) => !oldSet.has(item));

    if (onlyAddedOrRemoved) {
      this.diffArraysSimple(oldArr, newArr); // Simplified diff.
    } else {
      this.diffArraysByReferenceNoDeepMerge(oldArr, newArr); // Detailed diff.
    }
  }

  /**
   * Simple diff operation for arrays, triggering callbacks for additions and removals.
   * @param {any[]} oldArr - The original array.
   * @param {any[]} newArr - The updated array.
   */
  private diffArraysSimple(oldArr: any[], newArr: any[]): void {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    // Trigger callbacks for removed elements.
    for (const item of oldSet) {
      if (!newSet.has(item)) {
        this.callback(item, undefined);
      }
    }

    // Trigger callbacks for added elements.
    for (const item of newSet) {
      if (!oldSet.has(item)) {
        this.callback(undefined, item);
      }
    }
  }

  /**
   * Adds a property to the watch list for a specific object.
   * @param {object} parent - The parent object containing the property.
   * @param {string} prop - The property to watch.
   */
  private addWatchEntry(parent: object, prop: string) {
    if (!this.watchList.has(parent)) {
      this.watchList.set(parent, new Set());
    }
    this.watchList.get(parent)?.add(prop);
  }

  /**
   * Removes a specific property from the watch list of an object.
   * If the object has no other watched properties, it is removed from the watch list entirely.
   * @param {object} parent - The parent object containing the property.
   * @param {string} prop - The property to remove from the watch list.
   */
  private removeWatchEntry(parent: object, prop: string): void {
    const watchedProps = this.watchList.get(parent);
    if (watchedProps) {
      watchedProps.delete(prop);
      if (watchedProps.size === 0) {
        this.watchList.delete(parent);
      }
    }
  }

  /**
   * Parses a string path to locate the parent object and property.
   * Supports nested paths (e.g., "user.details.age").
   * @param {string} path - The path to the property.
   * @returns {object} - An object containing the parent, property, and optional grandparent.
   * @throws {Error} If the path is invalid or does not resolve to an existing property.
   */
  private processWatchString(path: string): {
    grandParent?: Record<string, any>;
    parentPropertyName?: string;
    parent: Record<string, any>;
    property: string;
  } {
    const segments = path.split('.');
    if (segments.length === 0) {
      throw new Error(`❌ Invalid path: "${path}".`);
    }

    let grandParent: any = undefined;
    let parentPropertyName: string | undefined = undefined;

    const property = segments.pop()!; // Extract the last segment as the target property.

    if (segments.length > 0) {
      parentPropertyName = segments.pop()!;
    }

    let temp: any = this.data;
    for (const seg of segments) {
      if (!temp[seg]) {
        throw new Error(`❌ Invalid path "${path}". Segment "${seg}" does not exist.`);
      }
      temp = temp[seg];
    }

    let parent: any;
    if (parentPropertyName !== undefined) {
      grandParent = temp;
      parent = grandParent[parentPropertyName];
      if (!parent) {
        throw new Error(`❌ Invalid path. No parent object for property "${parentPropertyName}".`);
      }
    } else {
      parent = temp;
    }

    return {
      grandParent,
      parentPropertyName,
      parent,
      property,
    };
  }

  /**
   * Recursively makes all properties of an object reactive.
   * This ensures that nested objects are also tracked for changes.
   * @param {any} obj - The object to make reactive.
   */
  private deepReactive(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
      // Make the current object reactive.
      const reactiveObj = this.makeReactive(obj);

      // Recursively process all properties.
      for (const key in reactiveObj) {
        if (Object.prototype.hasOwnProperty.call(reactiveObj, key)) {
          const value = reactiveObj[key];
          if (typeof value === 'object' && value !== null) {
            this.deepReactive(value); // Process nested objects.
          }
        }
      }
    }
  }

  /**
   * Adds a property to the watch list, tracking it for changes.
   * Supports deep watching of nested objects if specified.
   * @param {string} path - The path to the property (e.g., "user.age").
   * @param {boolean} [deep=false] - Whether to watch nested properties recursively.
   */
  public watch(path: string, deep = false): void {
    const { parent, property } = this.processWatchString(path);

    if (this.hasWatchEntry(parent, property)) {
      return; // Property is already being watched.
    }

    const value = parent[property];

    if (typeof value === 'object' && value !== null) {
      if (deep) {
        this.deepReactive(value); // Make all nested properties reactive.
      } else if (!Array.isArray(value)) {
        this.makeReactive(value); // Make the object itself reactive.
      }
    }

    this.addWatchEntry(parent, property); // Track the property.
  }

  /**
   * Stops tracking changes for a specific property in the watch list.
   * If the property is a nested object, its sub-properties are also removed from tracking.
   * @param {string} path - The path to the property (e.g., "user.age").
   */
  public unwatch(path: string): void {
    const { parent, property } = this.processWatchString(path);

    this.removeWatchEntry(parent, property); // Remove the specific property from tracking.

    const value = parent[property];
    if (typeof value === 'object' && value !== null) {
      // Check if any nested properties are still being watched.
      for (const [watchedParent, _props] of this.watchList.entries()) {
        if (watchedParent === value) {
          return; // Do not remove the proxy if sub-properties are still watched.
        }
      }

      // Remove the proxy if no sub-properties are being watched.
      if (this.proxyCache.has(value)) {
        this.proxyCache.delete(value);
      }
    }
  }

  /**
   * Retrieves a snapshot of all currently watched properties.
   * @returns {Array<{parent: object, properties: string[]}>} - The list of watched properties.
   */
  public getWatchList(): { parent: object; properties: string[] }[] {
    return Array.from(this.watchList.entries()).map(([parent, props]) => ({
      parent,
      properties: Array.from(props), // Convert Set to Array for readability.
    }));
  }
}
