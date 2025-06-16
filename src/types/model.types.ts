import type { ModelCallback } from '../types';

export declare function createModel(
  initialData: T,
  callback: ModelCallback,
): {
  data: T;
  watch: (path: string, deep?: boolean) => void;
  unwatch: (path: string) => void;
  addObserver: (observer: () => void) => void;
  removeObserver: (observer: () => void) => void;
  getWatchList: () => { parent: object; properties: string[] }[];
};
