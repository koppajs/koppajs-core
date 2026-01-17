/**
 * Deterministically flushes rendering cycles for Vitest + JSDOM.
 * Awaits a microtask and then requestAnimationFrame for each cycle.
 * @param {number} cycles - Number of flush cycles (default: 2)
 */
export async function flushRender(cycles: number = 2): Promise<void> {
    for (let i = 0; i < cycles; i++) {
        // Await a microtask
        await Promise.resolve();
        // Await next animation frame
        await new Promise<void>(resolve => {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => resolve());
            } else {
                // Fallback for environments without rAF (should not be needed in JSDOM)
                resolve();
            }
        });
    }
}