
import { describe, it, expect } from 'vitest';
import { STRUCT_ID, SLOT_ID, setStructId, getStructId, setSlotId, getSlotId } from '../../src/utils/identity';

describe('identity helpers', () => {
  it('positive: set/get works for struct and slot', () => {
    const node = {};
    setStructId(node, 'struct-123');
    setSlotId(node, 'slot-456');
    expect(getStructId(node)).toBe('struct-123');
    expect(getSlotId(node)).toBe('slot-456');
  });

  it('negative: reading unset returns undefined', () => {
    const node = {};
    expect(getStructId(node)).toBeUndefined();
    expect(getSlotId(node)).toBeUndefined();
  });

  it('edge: property is non-enumerable and does not appear in Object.keys or for...in', () => {
    const node = {};
    setStructId(node, 'struct-abc');
    setSlotId(node, 'slot-def');
    expect(Object.keys(node)).not.toContain(STRUCT_ID as any);
    expect(Object.keys(node)).not.toContain(SLOT_ID as any);
    let found = false;
    for (const key in node) {
      if (key === STRUCT_ID || key === SLOT_ID) found = true;
    }
    expect(found).toBe(false);
  });
});
