import type { Data, Function, Methods } from '../types';

export declare function isArrowFunction(func: Function): boolean;

export declare function bindMethods(data: Data, methods: Methods): void;

export declare function containsHTML(input: string): boolean;

export declare function getValueByPath(obj: any, path: string): any;

export declare function generateCompactUniqueId(): string;
