import type {
  CompiledScript,
  Data,
  Function,
  HookRegistry,
  IModule,
  IPlugin,
  Methods,
  PropertyDescriptor,
  Record,
  Users,
} from '../types';

export declare const ExtensionRegistry: {
  modules: Record<
    string,
    import('C:/Users/morty/git-repos/koppajs/koppajs-core/src/types').IModule
  >;
  plugins: Record<
    string,
    import('C:/Users/morty/git-repos/koppajs/koppajs-core/src/types').IPlugin
  >;
};

export declare const extend: () => void;

export declare function isArrowFunction(func: Function): boolean;

export declare function bindMethods(data: Data, methods: Methods): void;

export declare function containsHTML(input: string): boolean;

export declare function getValueByPath(obj: any, path: string): any;

export declare function generateCompactUniqueId(): string;

export declare const domExtensions: { [key: string]: PropertyDescriptor };

export declare const objectExtensions: { [key: string]: PropertyDescriptor };

export declare function kebabToCamel(s: string): string;

export declare function evaluateExpression(expression: string, data: Record<string, any> = {}): any;

export declare function compileCode(strg: string): CompiledScript;

export declare function createHookRegistry(): HookRegistry<T>;

export declare const GlobalHooks: import('C:/Users/morty/git-repos/koppajs/koppajs-core/src/types').HookRegistry<any>;
