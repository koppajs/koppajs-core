import type { ComponentInstance, ComponentSource, IModule, IPlugin } from '../types';

export function isComponentSource(ext: any): ext is ComponentSource {
  return (
    typeof ext?.template === 'string' &&
    typeof ext?.script === 'string' &&
    typeof ext?.style === 'string'
  );
}

export function isPlugin(ext: any): ext is IPlugin {
  return typeof ext?.setup === 'function' && ext?.attach === undefined;
}

export function isModule(ext: any): ext is IModule {
  return typeof ext?.attach === 'function' && ext?.setup === undefined;
}

export function isHTMLElementWithInstance(
  el: unknown,
): el is HTMLElement & { instance: ComponentInstance } {
  return el instanceof HTMLElement && 'instance' in el;
}

export function isValidLoopMatch(
  match: RegExpMatchArray | null,
): match is [string, string, string] {
  return !!match && match.length === 3 && Boolean(match[1]) && Boolean(match[2]);
}
