/**
 * Symbol to identify whether an object is a Proxy.
 */
const IS_PROXY = Symbol("isProxy");

/**
 * WeakMap für Proxy Cache - global für alle Models
 */
const globalProxyCache = new WeakMap<object, object>();

/**
 * Erstellt ein reaktives Model mit Proxy-based change detection.
 *
 * @param initialData - Initial data for the model
 * @param callback - Function to handle value changes
 * @returns Model interface with data and methods
 */
export function createModel<T extends Record<string, any>>(
  initialData: T,
): {
  data: T;
  watch: (path: string, deep?: boolean) => void;
  unwatch: (path: string) => void;
  addObserver: (observer: () => void) => void;
  removeObserver: (observer: () => void) => void;
  getWatchList: () => { parent: object; properties: string[] }[];
} {
  // Private state
  const observers = new Set<() => void>();
  const watchList = new Map<object, Set<string>>();

  // Enhanced callback that also notifies observers
  const enhancedCallback = () => {
    observers.forEach((observer) => observer());
  };

  const isProxy = (obj: any): boolean => {
    return !!obj && typeof obj === "object" && Reflect.get(obj, IS_PROXY);
  };

  const isPrimitive = (value: any): boolean => {
    return (
      value !== null &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "function" ||
        typeof value === "undefined")
    );
  };

  const hasWatchEntry = (
    parentObj?: object,
    property?: string,
    value?: any,
  ): boolean => {
    if (parentObj && property) {
      return watchList.get(parentObj)?.has(property) || false;
    }

    if (value !== undefined) {
      for (const [parent, props] of watchList.entries()) {
        for (const prop of props) {
          if (Reflect.get(parent, prop) === value) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const isWatched = (parent: object, property: string): boolean => {
    return hasWatchEntry(parent, property);
  };

  const isWholeValueWatched = (value: any): boolean => {
    return hasWatchEntry(undefined, undefined, value);
  };

  const addWatchEntry = (parent: object, prop: string) => {
    if (!watchList.has(parent)) {
      watchList.set(parent, new Set());
    }
    watchList.get(parent)?.add(prop);
  };

  const removeWatchEntry = (parent: object, prop: string): void => {
    const watchedProps = watchList.get(parent);
    if (watchedProps) {
      watchedProps.delete(prop);
      if (watchedProps.size === 0) {
        watchList.delete(parent);
      }
    }
  };

  // Diff functions for arrays
  const findLCSByRef = (oldArr: any[], newArr: any[]): [number, number][] => {
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
  };

  const diffArraysByReferenceNoDeepMerge = (
    oldArr: any[],
    newArr: any[],
  ): void => {
    if (oldArr === newArr) return;

    const lcsPairs = findLCSByRef(oldArr, newArr);
    let i = 0,
      j = 0,
      pairIndex = 0;

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

  const diffArraysSimple = (oldArr: any[], newArr: any[]): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    for (const item of oldSet) {
      if (!newSet.has(item)) {
        enhancedCallback();
      }
    }

    for (const item of newSet) {
      if (!oldSet.has(item)) {
        enhancedCallback();
      }
    }
  };

  const diffArraysOptimized = (oldArr: any[], newArr: any[]): void => {
    const oldSet = new Set(oldArr);
    const newSet = new Set(newArr);

    const onlyAddedOrRemoved =
      oldArr.length !== newArr.length ||
      [...oldSet].some((item) => !newSet.has(item)) ||
      [...newSet].some((item) => !oldSet.has(item));

    if (onlyAddedOrRemoved) {
      diffArraysSimple(oldArr, newArr);
    } else {
      diffArraysByReferenceNoDeepMerge(oldArr, newArr);
    }
  };

  const mergeInPlaceObject = (oldObj: any, newObj: any): void => {
    if (oldObj === newObj) return;

    // Remove properties not in new object
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        if (isWatched(oldObj, key)) {
          enhancedCallback();
        }
        Reflect.deleteProperty(oldObj, key);
      }
    }

    // Add or update properties from new object
    for (const key of Object.keys(newObj)) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      if (oldVal !== newVal) {
        if (
          oldVal &&
          typeof oldVal === "object" &&
          isProxy(oldVal) &&
          newVal &&
          typeof newVal === "object" &&
          !isProxy(newVal)
        ) {
          mergeInPlaceObject(oldVal, newVal);
          if (oldVal !== newVal && isWatched(oldObj, key)) {
            enhancedCallback();
            Reflect.set(oldObj, key, newVal);
          }
        } else {
          if (isWatched(oldObj, key)) {
            enhancedCallback();
          }
          Reflect.set(oldObj, key, newVal);
        }
      }
    }
  };

  // Main reactive wrapper
  const makeReactive = (obj: any): any => {
    if (obj !== null && typeof obj === "object") {
      if (globalProxyCache.has(obj)) {
        return globalProxyCache.get(obj);
      }

      const proxy = new Proxy(obj, {
        get: (target, property, receiver) => {
          if (property === IS_PROXY) return true;
          return Reflect.get(target, property, receiver);
        },

        set: (target, property, value, receiver) => {
          const oldValue = Reflect.get(target, property, receiver);
          if (oldValue === value) return true;

          const isWatchedProperty = isWatched(target, property.toString());

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
            oldValue &&
            typeof oldValue === "object" &&
            isProxy(oldValue) &&
            value &&
            typeof value === "object" &&
            !isProxy(value)
          ) {
            mergeInPlaceObject(oldValue, value);
            if (oldValue !== value) {
              enhancedCallback();
              let finalVal = value;
              if (
                finalVal &&
                typeof finalVal === "object" &&
                !isProxy(finalVal)
              ) {
                finalVal = makeReactive(finalVal);
              }
              Reflect.set(target, property, finalVal, receiver);
            }
            return true;
          }

          // Standard property assignment
          const result = Reflect.set(target, property, value, receiver);
          if (isWatchedProperty && oldValue !== value) {
            if (value && typeof value === "object" && !isProxy(value)) {
              value = makeReactive(value);
              Reflect.set(target, property, value, receiver);
            }
            enhancedCallback();
          }
          return result;
        },

        deleteProperty: (target, property) => {
          const propName = property.toString();
          const oldValue = Reflect.get(target, property);
          const isWatchedProperty = isWatched(target, propName);

          const isDeleted = Reflect.deleteProperty(target, property);

          if (isWatchedProperty && oldValue !== undefined) {
            enhancedCallback();
          }

          return isDeleted;
        },
      });

      globalProxyCache.set(obj, proxy);
      return proxy;
    }

    return obj;
  };

  const deepReactive = (obj: any): void => {
    if (typeof obj === "object" && obj !== null) {
      const reactiveObj = makeReactive(obj);
      for (const key in reactiveObj) {
        if (Object.prototype.hasOwnProperty.call(reactiveObj, key)) {
          const value = reactiveObj[key];
          if (typeof value === "object" && value !== null) {
            deepReactive(value);
          }
        }
      }
    }
  };

  const processWatchString = (
    path: string,
    data: T,
  ): {
    grandParent?: Record<string, any>;
    parentPropertyName?: string;
    parent: Record<string, any>;
    property: string;
  } => {
    const segments = path.split(".");
    if (segments.length === 0) {
      throw new Error(`❌ Invalid path: "${path}".`);
    }

    let grandParent: any = undefined;
    let parentPropertyName: string | undefined = undefined;
    const property = segments.pop()!;

    if (segments.length > 0) {
      parentPropertyName = segments.pop()!;
    }

    let temp: any = data;
    for (const seg of segments) {
      if (!temp[seg]) {
        throw new Error(
          `❌ Invalid path "${path}". Segment "${seg}" does not exist.`,
        );
      }
      temp = temp[seg];
    }

    let parent: any;
    if (parentPropertyName !== undefined) {
      grandParent = temp;
      parent = grandParent[parentPropertyName];
      if (!parent) {
        throw new Error(
          `❌ Invalid path. No parent object for property "${parentPropertyName}".`,
        );
      }
    } else {
      parent = temp;
    }

    return { grandParent, parentPropertyName, parent, property };
  };

  // Create reactive data
  const data = makeReactive(initialData);

  // Public API
  return {
    data,

    watch(path: string, deep = false): void {
      const { parent, property } = processWatchString(path, data);

      if (hasWatchEntry(parent, property)) {
        return;
      }

      const value = parent[property];

      if (typeof value === "object" && value !== null) {
        if (deep) {
          deepReactive(value);
        } else if (!Array.isArray(value)) {
          makeReactive(value);
        }
      }

      addWatchEntry(parent, property);
    },

    unwatch(path: string): void {
      const { parent, property } = processWatchString(path, data);
      removeWatchEntry(parent, property);

      const value = parent[property];
      if (typeof value === "object" && value !== null) {
        for (const [watchedParent] of watchList.entries()) {
          if (watchedParent === value) return;
        }

        if (globalProxyCache.has(value)) {
          globalProxyCache.delete(value);
        }
      }
    },

    addObserver(observer: () => void): void {
      observers.add(observer);
    },

    removeObserver(observer: () => void): void {
      observers.delete(observer);
    },

    getWatchList(): { parent: object; properties: string[] }[] {
      return Array.from(watchList.entries()).map(([parent, props]) => ({
        parent,
        properties: Array.from(props),
      }));
    },
  };
}
