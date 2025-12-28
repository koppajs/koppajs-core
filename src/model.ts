/**
 * Symbol to identify whether an object is a Proxy.
 */
const IS_PROXY = Symbol("isProxy");

/**
 * WeakMap für Proxy Cache - global für alle Models
 */
const globalProxyCache = new WeakMap<object, object>();

type WatchListSnapshot = { parent: object; properties: string[] };

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const toPropName = (property: PropertyKey): string =>
  typeof property === "symbol" ? property.toString() : String(property);

const getCachedProxy = <O extends object>(obj: O): O | undefined => {
  const cached = globalProxyCache.get(obj);
  return cached && isObject(cached) ? (cached as O) : undefined;
};

const isProxy = (obj: unknown): boolean => {
  if (!isObject(obj)) return false;
  return Reflect.get(obj, IS_PROXY) === true;
};

const isPrimitive = (value: unknown): boolean =>
  value !== null &&
  (typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "function" ||
    typeof value === "undefined");

export function createModel<T extends Record<string, unknown>>(
  initialData: T,
): {
  data: T;
  watch: (path: string, deep?: boolean) => void;
  unwatch: (path: string) => void;
  addObserver: (observer: () => void) => void;
  removeObserver: (observer: () => void) => void;
  getWatchList: () => WatchListSnapshot[];
} {
  // Private state
  const observers = new Set<() => void>();
  const watchList = new Map<object, Set<string>>();

  // Enhanced callback that also notifies observers
  const enhancedCallback = () => {
    observers.forEach((observer) => observer());
  };

  const hasWatchEntry = (
    parentObj?: object,
    property?: string,
    value?: unknown,
  ): boolean => {
    if (parentObj && property) {
      return watchList.get(parentObj)?.has(property) ?? false;
    }

    if (value !== undefined) {
      for (const [parent, props] of watchList.entries()) {
        for (const prop of props) {
          if (Reflect.get(parent, prop) === value) return true;
        }
      }
    }

    return false;
  };

  const isWatched = (parent: object, property: string): boolean =>
    hasWatchEntry(parent, property);

  const isWholeValueWatched = (value: unknown): boolean =>
    hasWatchEntry(undefined, undefined, value);

  const addWatchEntry = (parent: object, prop: string) => {
    const set = watchList.get(parent) ?? new Set<string>();
    set.add(prop);
    if (!watchList.has(parent)) watchList.set(parent, set);
  };

  const removeWatchEntry = (parent: object, prop: string): void => {
    const watchedProps = watchList.get(parent);
    if (!watchedProps) return;

    watchedProps.delete(prop);
    if (watchedProps.size === 0) watchList.delete(parent);
  };

  // Diff functions for arrays
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
  ): void => {
    if (oldArr === newArr) return;

    const lcsPairs = findLCSByRef(oldArr, newArr);
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
        enhancedCallback();
        i++;
      }

      while (j < lcsJ) {
        enhancedCallback();
        j++;
      }

      if (pairIndex < lcsPairs.length) {
        i = lcsI + 1;
        j = lcsJ + 1;
        pairIndex++;
      }
    }

    oldArr.splice(0, oldArr.length, ...newArr);
  };

  const diffArraysSimple = (oldArr: unknown[], newArr: unknown[]): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    for (const item of oldSet) if (!newSet.has(item)) enhancedCallback();
    for (const item of newSet) if (!oldSet.has(item)) enhancedCallback();
  };

  const diffArraysOptimized = (oldArr: unknown[], newArr: unknown[]): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    const onlyAddedOrRemoved =
      oldArr.length !== newArr.length ||
      [...oldSet].some((item) => !newSet.has(item)) ||
      [...newSet].some((item) => !oldSet.has(item));

    if (onlyAddedOrRemoved) diffArraysSimple(oldArr, newArr);
    else diffArraysByReferenceNoDeepMerge(oldArr, newArr);
  };

  const mergeInPlaceObject = (
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
  ): void => {
    if (oldObj === newObj) return;

    // Remove properties not in new object
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        if (isWatched(oldObj, key)) enhancedCallback();
        Reflect.deleteProperty(oldObj, key);
      }
    }

    // Add or update properties from new object
    for (const key of Object.keys(newObj)) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (oldVal === newVal) continue;

      if (isObject(oldVal) && isProxy(oldVal) && isObject(newVal) && !isProxy(newVal)) {
        mergeInPlaceObject(
          oldVal as Record<string, unknown>,
          newVal as Record<string, unknown>,
        );
        if (oldVal !== newVal && isWatched(oldObj, key)) {
          enhancedCallback();
          Reflect.set(oldObj, key, newVal);
        }
      } else {
        if (isWatched(oldObj, key)) enhancedCallback();
        Reflect.set(oldObj, key, newVal);
      }
    }
  };

  // Main reactive wrapper
  const makeReactive = <O extends object>(obj: O): O => {
    const cached = getCachedProxy(obj);
    if (cached) return cached;

    const proxy = new Proxy(obj, {
      get: (target, property, receiver) => {
        if (property === IS_PROXY) return true;
        return Reflect.get(target, property, receiver) as unknown;
      },

      set: (target, property, value, receiver) => {
        const oldValue = Reflect.get(target, property, receiver) as unknown;
        if (oldValue === value) return true;

        const propName = toPropName(property);

        const receiverObj = isObject(receiver) ? receiver : undefined;

        const isWatchedProperty =
          isWatched(target, propName) ||
          (receiverObj ? isWatched(receiverObj, propName) : false);

        // Special array handling
        if (
          isWatchedProperty &&
          Array.isArray(oldValue) &&
          !isPrimitive(value) &&
          Array.isArray(value) &&
          isWholeValueWatched(oldValue)
        ) {
          diffArraysOptimized(oldValue, value);
          return true;
        }

        // Special object handling
        if (
          isWatchedProperty &&
          isObject(oldValue) &&
          isProxy(oldValue) &&
          isObject(value) &&
          !isProxy(value)
        ) {
          mergeInPlaceObject(
            oldValue as Record<string, unknown>,
            value as Record<string, unknown>,
          );
          if (oldValue !== value) {
            enhancedCallback();

            let finalVal: unknown = value;
            if (isObject(finalVal) && !isProxy(finalVal)) {
              finalVal = makeReactive(finalVal);
            }

            Reflect.set(target, property, finalVal, receiver);
          }
          return true;
        }

        // Standard property assignment
        const result = Reflect.set(target, property, value, receiver);

        if (isWatchedProperty && oldValue !== value) {
          if (isObject(value) && !isProxy(value)) {
            const reactive = makeReactive(value);
            Reflect.set(target, property, reactive, receiver);
          }
          enhancedCallback();
        }

        return result;
      },

      deleteProperty: (target, property) => {
        const propName = toPropName(property);
        const oldValue = Reflect.get(target, property) as unknown;

        const maybeProxy = globalProxyCache.get(target);
        const proxyObj = isObject(maybeProxy) ? maybeProxy : undefined;

        const isWatchedProperty =
          isWatched(target, propName) ||
          (proxyObj ? isWatched(proxyObj, propName) : false);

        const isDeleted = Reflect.deleteProperty(target, property);

        if (isWatchedProperty && oldValue !== undefined) enhancedCallback();
        return isDeleted;
      },
    });

    globalProxyCache.set(obj, proxy);
    return proxy;
  };

  const deepReactive = (obj: unknown): void => {
    if (!isObject(obj)) return;

    const reactiveObj = makeReactive(obj);
    for (const key in reactiveObj as Record<string, unknown>) {
      if (!Object.prototype.hasOwnProperty.call(reactiveObj, key)) continue;

      const value = (reactiveObj as Record<string, unknown>)[key];
      if (isObject(value)) deepReactive(value);
    }
  };

  const processWatchString = (
    path: string,
    data: T,
  ): {
    grandParent?: Record<string, unknown>;
    parentPropertyName?: string;
    parent: Record<string, unknown>;
    property: string;
  } => {
    const segments = path.split(".");
    if (segments.length === 0) throw new Error(`❌ Invalid path: "${path}".`);

    let grandParent: Record<string, unknown> | undefined = undefined;
    let parentPropertyName: string | undefined = undefined;

    const property = segments.pop()!;
    if (segments.length > 0) parentPropertyName = segments.pop()!;

    let temp: unknown = data;

    for (const seg of segments) {
      if (!isObject(temp)) {
        throw new Error(
          `❌ Invalid path "${path}". Segment "${seg}" is not an object.`,
        );
      }
      const next = Reflect.get(temp, seg) as unknown;
      if (!next) {
        throw new Error(
          `❌ Invalid path "${path}". Segment "${seg}" does not exist.`,
        );
      }
      temp = next;
    }

    let parent: unknown;
    if (parentPropertyName !== undefined) {
      grandParent = temp as Record<string, unknown>;
      parent = grandParent[parentPropertyName];
      if (!isObject(parent)) {
        throw new Error(
          `❌ Invalid path. No parent object for property "${parentPropertyName}".`,
        );
      }
    } else {
      parent = temp;
      if (!isObject(parent)) {
        throw new Error(`❌ Invalid path "${path}". Parent is not an object.`);
      }
    }

    return {
      grandParent,
      parentPropertyName,
      parent: parent as Record<string, unknown>,
      property,
    };
  };

  // Create reactive data
  const data = makeReactive(initialData);

  // Public API
  return {
    data,

    watch(path: string, deep = false): void {
      const { parent, property } = processWatchString(path, data);

      if (hasWatchEntry(parent, property)) return;

      const value = parent[property];

      if (isObject(value)) {
        if (deep) deepReactive(value);
        else if (!Array.isArray(value)) makeReactive(value);
      }

      addWatchEntry(parent, property);
    },

    unwatch(path: string): void {
      const { parent, property } = processWatchString(path, data);
      removeWatchEntry(parent, property);

      const value = parent[property];
      if (!isObject(value)) return;

      // Wenn das Value-Objekt nirgendwo mehr als Parent im watchList steht, darf es aus dem Cache
      for (const [watchedParent] of watchList.entries()) {
        if (watchedParent === value) return;
      }

      const cached = getCachedProxy(value);
      if (cached) globalProxyCache.delete(value);
    },

    addObserver(observer: () => void): void {
      observers.add(observer);
    },

    removeObserver(observer: () => void): void {
      observers.delete(observer);
    },

    getWatchList(): WatchListSnapshot[] {
      return Array.from(watchList.entries()).map(([parent, props]) => ({
        parent,
        properties: Array.from(props),
      }));
    },
  };
}
