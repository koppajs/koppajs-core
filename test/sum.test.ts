import { describe, it, expect } from 'vitest';

// Example function for testing (replace with your actual function)
const addNumbers = (a: number, b: number) => a + b;

describe('addNumbers', () => {
  it('should return 5 when adding 2 and 3', () => {
    expect(addNumbers(2, 3)).toBe(5);
  });

  it('should return 0 when adding 0 and 0', () => {
    expect(addNumbers(0, 0)).toBe(0);
  });

  it('should return -1 when adding -2 and 1', () => {
    expect(addNumbers(-2, 1)).toBe(-1);
  });

  it('should return 10 when adding 7 and 3', () => {
    expect(addNumbers(7, 3)).toBe(10);
  });

  it('should return 100 when adding 50 and 50', () => {
    expect(addNumbers(50, 50)).toBe(100);
  });

  it('should correctly add floating point numbers', () => {
    expect(addNumbers(0.1, 0.2)).toBeCloseTo(0.3, 10);
  });
});
