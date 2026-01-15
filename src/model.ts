import { IS_PROXY } from "./types";

/**
 * WeakMap for Proxy cache - global for all models.
 * Maps original object -> proxy
 */
const globalProxyCache = new WeakMap<object, object>();

/**
 * WeakMap for reverse lookup - proxy -> original object.
 * This allows us to find the original object from a proxy.
 */
const globalProxyToOriginalCache = new WeakMap<object, object>();

/**
 * Type guard to check if value is an object.
 */
const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

/**
 * Converts a property key to a string.
 */
const toPropName = (property: PropertyKey): string =>
  typeof property === "symbol" ? property.toString() : String(property);

/**
 * Gets cached proxy for an object if it exists.
 */
const getCachedProxy = <O extends object>(obj: O): O | undefined => {
  const cached = globalProxyCache.get(obj);
  return cached && isObject(cached) ? (cached as O) : undefined;
};

// Get the original object from a proxy (if it's a proxy) or return the object itself
export function getOriginalObject(obj: object): object {
  // Check if obj is a proxy by looking in the reverse cache
  const original = globalProxyToOriginalCache.get(obj);
  if (original) return original;
  // If not found, obj is likely the original
  return obj;
}

/**
 * Checks if an object is a reactive proxy.
 */
export const isProxy = (obj: unknown): boolean => {
  if (!isObject(obj)) return false;
  return Reflect.get(obj, IS_PROXY) === true;
};

/**
 * Checks if a value is a primitive type.
 */
const isPrimitive = (value: unknown): boolean =>
  value !== null &&
  (typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "function" ||
    typeof value === "undefined");

/**
 * Watcher callback info passed to watch callbacks.
 */
export interface WatcherInfo {
  changedPaths: Set<string>;
}

/**
 * Watcher callback type.
 */
export type WatcherCallback = (info: WatcherInfo) => void;

/**
 * Creates a reactive model with proxy-based reactivity.
 * Tracks property changes and notifies observers when state changes.
 * Supports effect subscriptions via watch() with prefix-matching and batching.
 * @param initialData - Initial state object
 * @returns Reactive model with watch and observer methods
 */
export function createModel<T extends Record<string, unknown>>(
  initialData: T,
): {
  state: T;
  watch: (path: string, cb: WatcherCallback) => () => void;
  addObserver: (observer: () => void) => void;
  removeObserver: (observer: () => void) => void;
  getStateVersion: () => number;
  flushChanges: () => Set<string>;
} {
  // Private state
  const observers = new Set<() => void>();
  const objectPaths = new WeakMap<object, string>(); // Track each object's path in the state tree
  let stateVersion = 0; // Version counter for state changes
  let changedPaths = new Set<string>();

  // Watcher subscriptions: path prefix -> Set of callbacks
  const watchers = new Map<string, Set<WatcherCallback>>();

  /**
   * Checks if a changed path matches a watcher's path prefix.
   * A watcher for "user" matches "user" and anything starting with "user.".
   */
  const pathMatchesPrefix = (
    changedPath: string,
    watchPrefix: string,
  ): boolean => {
    if (changedPath === watchPrefix) return true;
    if (changedPath.startsWith(watchPrefix + ".")) return true;
    return false;
  };

  /**
   * Builds the fully qualified path for a property on a target object.
   */
  const buildPath = (target: object, property: string): string => {
    const parentPath = objectPaths.get(target) ?? "";
    return parentPath ? `${parentPath}.${property}` : property;
  };

  /**
   * Single code path for notifying observers after a state mutation.
   * Records the path, increments stateVersion exactly once, and notifies all observers.
   */
  const notifyObservers = (path: string): void => {
    changedPaths.add(path);
    stateVersion++;
    observers.forEach((observer) => observer());
  };

  // Diff functions for arrays - now accept a path for notifying observers
  const findLCSByRef = (
    oldArr: unknown[],
    newArr: unknown[],
  ): [number, number][] => {
    const lenA = oldArr.length;
    const lenB = newArr.length;
    const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
      new Array(lenB + 1).fill(0),
    );

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
    let i = lenA;
    let j = lenB;

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
  };

  const diffArraysByReferenceNoDeepMerge = (
    oldArr: unknown[],
    newArr: unknown[],
    path: string,
  ): void => {
    if (oldArr === newArr) return;

    const lcsPairs = findLCSByRef(oldArr, newArr);
    let hasChanges = false;
    let i = 0;
    let j = 0;
    let pairIndex = 0;

    while (
      pairIndex < lcsPairs.length ||
      i < oldArr.length ||
      j < newArr.length
    ) {
      const [lcsI, lcsJ] =
        pairIndex < lcsPairs.length
          ? lcsPairs[pairIndex]!
          : [oldArr.length, newArr.length];

      while (i < lcsI) {
        hasChanges = true;
        i++;
      }

      while (j < lcsJ) {
        hasChanges = true;
        j++;
      }

      if (pairIndex < lcsPairs.length) {
        i = lcsI + 1;
        j = lcsJ + 1;
        pairIndex++;
      }
    }

    oldArr.splice(0, oldArr.length, ...newArr);

    if (hasChanges) {
      notifyObservers(path);
    }
  };

  const diffArraysSimple = (
    oldArr: unknown[],
    newArr: unknown[],
    path: string,
  ): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    let hasChanges = false;
    for (const item of oldSet) {
      if (!newSet.has(item)) {
        hasChanges = true;
        break;
      }
    }
    if (!hasChanges) {
      for (const item of newSet) {
        if (!oldSet.has(item)) {
          hasChanges = true;
          break;
        }
      }
    }

    if (hasChanges) {
      // Mutate oldArr to match newArr before notifying
      oldArr.splice(0, oldArr.length, ...newArr);
      notifyObservers(path);
    }
  };

  const diffArraysOptimized = (
    oldArr: unknown[],
    newArr: unknown[],
    path: string,
  ): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    const onlyAddedOrRemoved =
      oldArr.length !== newArr.length ||
      [...oldSet].some((item) => !newSet.has(item)) ||
      [...newSet].some((item) => !oldSet.has(item));

    if (onlyAddedOrRemoved) diffArraysSimple(oldArr, newArr, path);
    else diffArraysByReferenceNoDeepMerge(oldArr, newArr, path);
  };

  const mergeInPlaceObject = (
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    basePath: string,
  ): boolean => {
    if (oldObj === newObj) return false;

    let hasChanges = false;

    // Remove properties not in new object
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        hasChanges = true;
        Reflect.deleteProperty(oldObj, key);
      }
    }

    // Add or update properties from new object
    for (const key of Object.keys(newObj)) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (oldVal === newVal) continue;

      const nestedPath = basePath ? `${basePath}.${key}` : key;

      if (
        isObject(oldVal) &&
        isProxy(oldVal) &&
        isObject(newVal) &&
        !isProxy(newVal)
      ) {
        const nestedChanged = mergeInPlaceObject(
          oldVal as Record<string, unknown>,
          newVal as Record<string, unknown>,
          nestedPath,
        );
        if (nestedChanged) {
          hasChanges = true;
        }
        if (oldVal !== newVal) {
          hasChanges = true;
          Reflect.set(oldObj, key, newVal);
        }
      } else {
        hasChanges = true;
        Reflect.set(oldObj, key, newVal);
      }
    }

    return hasChanges;
  };

  // Main reactive wrapper
  const makeReactive = <O extends object>(obj: O, parentPath = ""): O => {
    // Don't make DOM nodes, Window, or Document reactive - Proxies don't work with native DOM APIs
    if (
      obj instanceof Node ||
      obj instanceof Window ||
      obj instanceof Document
    ) {
      return obj;
    }

    const cached = getCachedProxy(obj);
    if (cached) return cached;

    // Track this object's path in the state tree
    if (parentPath) {
      objectPaths.set(obj, parentPath);
    }

    const proxy = new Proxy(obj, {
      get: (target, property, receiver) => {
        if (property === IS_PROXY) return true;
        // Handle toJSON for JSON.stringify - return the original object to avoid circular references
        if (property === "toJSON") {
          return function () {
            // Return the original object (not the proxy) to avoid circular references
            return getOriginalObject(target);
          };
        }
        const value = Reflect.get(target, property, receiver) as unknown;
        // Automatically make nested objects reactive when accessed
        if (isObject(value) && !isProxy(value) && !Array.isArray(value)) {
          const propName = toPropName(property);
          const nestedPath = buildPath(target, propName);
          return makeReactive(value, nestedPath);
        }
        return value;
      },

      set: (target, property, value, receiver) => {
        const oldValue = Reflect.get(target, property, receiver) as unknown;
        if (oldValue === value) return true;

        const propName = toPropName(property);
        const path = buildPath(target, propName);

        // Special array handling - diff and notify once
        if (
          Array.isArray(oldValue) &&
          !isPrimitive(value) &&
          Array.isArray(value)
        ) {
          diffArraysOptimized(oldValue, value, path);
          return true;
        }

        // Special object handling - merge in place and notify once
        if (
          isObject(oldValue) &&
          isProxy(oldValue) &&
          isObject(value) &&
          !isProxy(value)
        ) {
          const hasChanges = mergeInPlaceObject(
            oldValue as Record<string, unknown>,
            value as Record<string, unknown>,
            path,
          );
          if (hasChanges) {
            let finalVal: unknown = value;
            if (isObject(finalVal) && !isProxy(finalVal)) {
              finalVal = makeReactive(finalVal, path);
            }
            Reflect.set(target, property, finalVal, receiver);
            notifyObservers(path);
          }
          return true;
        }

        // Standard property assignment
        const result = Reflect.set(target, property, value, receiver);

        if (isObject(value) && !isProxy(value)) {
          const reactive = makeReactive(value, path);
          Reflect.set(target, property, reactive, receiver);
        }

        // Single notification for this mutation
        notifyObservers(path);

        return result;
      },

      deleteProperty: (target, property) => {
        const propName = toPropName(property);
        const path = buildPath(target, propName);
        const oldValue = Reflect.get(target, property) as unknown;

        const isDeleted = Reflect.deleteProperty(target, property);

        if (isDeleted && oldValue !== undefined) {
          notifyObservers(path);
        }
        return isDeleted;
      },
    });

    globalProxyCache.set(obj, proxy);
    globalProxyToOriginalCache.set(proxy, obj);
    return proxy;
  };

  // Create reactive state
  const state = makeReactive(initialData);

  // Public API
  return {
    state,

    /**
     * Registers a watcher for a path prefix.
     * The callback is called at most once per flush cycle with the subset of
     * changed paths that match this watcher's prefix.
     *
     * Prefix-match rules:
     * - A watcher for "user" matches "user" and anything starting with "user."
     *
     * @param path - The path prefix to watch
     * @param cb - Callback receiving { changedPaths: Set<string> } with matching paths
     * @returns A cleanup function stop() that unregisters this watcher (idempotent)
     */
    watch(path: string, cb: WatcherCallback): () => void {
      let callbacks = watchers.get(path);
      if (!callbacks) {
        callbacks = new Set();
        watchers.set(path, callbacks);
      }
      callbacks.add(cb);

      // Track if already stopped to make stop() idempotent
      let stopped = false;

      // Return cleanup function
      return () => {
        if (stopped) return;
        stopped = true;

        const cbs = watchers.get(path);
        if (cbs) {
          cbs.delete(cb);
          if (cbs.size === 0) {
            watchers.delete(path);
          }
        }
      };
    },

    addObserver(observer: () => void): void {
      observers.add(observer);
    },

    removeObserver(observer: () => void): void {
      observers.delete(observer);
    },

    getStateVersion(): number {
      return stateVersion;
    },

    /**
     * Flushes changed paths and notifies watchers.
     * Each watcher callback is called at most once with the subset of changed paths
     * that match its prefix.
     *
     * @returns A copy of all changed paths since the last flush
     */
    flushChanges(): Set<string> {
      const result = new Set(changedPaths);

      // Notify watchers with their relevant subset of changed paths (batched)
      if (result.size > 0 && watchers.size > 0) {
        // Collect callbacks and their matching paths to avoid issues during iteration
        const callbacksToNotify = new Map<WatcherCallback, Set<string>>();

        for (const [prefix, callbacks] of watchers) {
          const matchingPaths = new Set<string>();
          for (const changedPath of result) {
            if (pathMatchesPrefix(changedPath, prefix)) {
              matchingPaths.add(changedPath);
            }
          }

          if (matchingPaths.size > 0) {
            for (const cb of callbacks) {
              // Merge paths if callback is registered under multiple prefixes
              const existingPaths = callbacksToNotify.get(cb);
              if (existingPaths) {
                for (const p of matchingPaths) {
                  existingPaths.add(p);
                }
              } else {
                callbacksToNotify.set(cb, new Set(matchingPaths));
              }
            }
          }
        }

        // Call each callback exactly once with its merged matching paths
        for (const [cb, paths] of callbacksToNotify) {
          cb({ changedPaths: paths });
        }
      }

      changedPaths = new Set<string>();
      return result;
    },
  };
}
