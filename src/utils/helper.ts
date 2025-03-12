export function isArrowFunction(func: Function): boolean {
  return typeof func === 'function' && !func.hasOwnProperty('prototype');
}

export function bindMethods(data: Data, methods: Methods): void {
  for (const method in methods) {
    if (methods[method]) {
      data[method] = methods[method].bind(data);
    }
  }
}

export function containsHTML(input: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(input);
}

export function getValueByPath(obj: any, path: string): any {
  if (!obj || typeof path !== 'string') return undefined;

  const pathArray = path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  try {
    return pathArray.reduce((acc, key) => acc && acc[key], obj);
  } catch {
    return undefined;
  }
}
