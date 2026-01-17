import { describe, it, expect } from "vitest";
import { createModel, getSlotIdsForArray } from "../src/model";

describe("getSlotIdsForArray", () => {
  describe("positive case - retrieves slotIds for reactive array", () => {
    it("returns slotIds array with same length as reactive array", () => {
      const model = createModel({ items: [1, 2, 3] });
      
      const slotIds = getSlotIdsForArray(model.state.items);
      
      expect(slotIds).toBeDefined();
      expect(slotIds).toHaveLength(3);
      expect(Array.isArray(slotIds)).toBe(true);
      // Each slotId should be a unique string
      expect(slotIds![0]).toMatch(/^slot-\d+$/);
      expect(slotIds![1]).toMatch(/^slot-\d+$/);
      expect(slotIds![2]).toMatch(/^slot-\d+$/);
      // All slotIds should be unique
      expect(new Set(slotIds).size).toBe(3);
    });
  });

  describe("negative case - non-reactive array returns undefined", () => {
    it("returns undefined for plain non-reactive array", () => {
      const plainArray = [1, 2, 3];
      
      const slotIds = getSlotIdsForArray(plainArray);
      
      expect(slotIds).toBeUndefined();
    });

    it("returns undefined for empty non-reactive array", () => {
      const emptyArray: unknown[] = [];
      
      const slotIds = getSlotIdsForArray(emptyArray);
      
      expect(slotIds).toBeUndefined();
    });
  });

  describe("edge case - slotIds reflect structural operations", () => {
    it("slotIds length/order updates after push operation", () => {
      const model = createModel({ items: [10, 20] });
      
      const initialSlotIds = getSlotIdsForArray(model.state.items);
      expect(initialSlotIds).toHaveLength(2);
      const firstTwoIds = [...initialSlotIds!];
      
      // Push new elements
      model.state.items.push(30, 40);
      
      const updatedSlotIds = getSlotIdsForArray(model.state.items);
      expect(updatedSlotIds).toHaveLength(4);
      // First two slotIds should be preserved
      expect(updatedSlotIds![0]).toBe(firstTwoIds[0]);
      expect(updatedSlotIds![1]).toBe(firstTwoIds[1]);
      // New slotIds for pushed elements
      expect(updatedSlotIds![2]).toMatch(/^slot-\d+$/);
      expect(updatedSlotIds![3]).toMatch(/^slot-\d+$/);
    });

    it("slotIds reorder after reverse operation", () => {
      const model = createModel({ items: ["a", "b", "c"] });
      
      const initialSlotIds = getSlotIdsForArray(model.state.items);
      const originalOrder = [...initialSlotIds!];
      
      // Reverse the array
      model.state.items.reverse();
      
      const updatedSlotIds = getSlotIdsForArray(model.state.items);
      expect(updatedSlotIds).toHaveLength(3);
      // SlotIds should be reversed
      expect(updatedSlotIds![0]).toBe(originalOrder[2]);
      expect(updatedSlotIds![1]).toBe(originalOrder[1]);
      expect(updatedSlotIds![2]).toBe(originalOrder[0]);
    });

    it("slotIds length updates after pop operation", () => {
      const model = createModel({ items: [1, 2, 3, 4] });
      
      const initialSlotIds = getSlotIdsForArray(model.state.items);
      expect(initialSlotIds).toHaveLength(4);
      const firstThreeIds = initialSlotIds!.slice(0, 3);
      
      // Pop the last element
      model.state.items.pop();
      
      const updatedSlotIds = getSlotIdsForArray(model.state.items);
      expect(updatedSlotIds).toHaveLength(3);
      // First three slotIds should be preserved
      expect(updatedSlotIds![0]).toBe(firstThreeIds[0]);
      expect(updatedSlotIds![1]).toBe(firstThreeIds[1]);
      expect(updatedSlotIds![2]).toBe(firstThreeIds[2]);
    });

    it("slotIds update correctly after splice operation", () => {
      const model = createModel({ items: [10, 20, 30, 40, 50] });
      
      const initialSlotIds = getSlotIdsForArray(model.state.items);
      const firstId = initialSlotIds![0];
      const lastId = initialSlotIds![4];
      
      // Remove 3 elements starting at index 1, insert 2 new elements
      model.state.items.splice(1, 3, 100, 200);
      
      const updatedSlotIds = getSlotIdsForArray(model.state.items);
      expect(updatedSlotIds).toHaveLength(4); // [10, 100, 200, 50]
      // First slotId should be preserved
      expect(updatedSlotIds![0]).toBe(firstId);
      // Middle two should be new slotIds
      expect(updatedSlotIds![1]).toMatch(/^slot-\d+$/);
      expect(updatedSlotIds![2]).toMatch(/^slot-\d+$/);
      expect(updatedSlotIds![1]).not.toBe(firstId);
      expect(updatedSlotIds![2]).not.toBe(firstId);
      // Last slotId should be preserved
      expect(updatedSlotIds![3]).toBe(lastId);
    });
  });

  describe("array replacement semantics - sidecar always on live array instance", () => {
    it("full array replacement keeps same array reference but creates new slotIds", () => {
      const model = createModel({ items: [1, 2, 3] });
      
      // Get the original array reference
      const originalArrayRef = model.state.items;
      const initialSlotIds = getSlotIdsForArray(model.state.items);
      expect(initialSlotIds).toHaveLength(3);
      const initialSlotIdValues = [...initialSlotIds!];
      
      // Full array replacement with new content
      model.state.items = [10, 20, 30, 40];
      
      // Array reference should be the same (in-place mutation)
      expect(model.state.items).toBe(originalArrayRef);
      
      // SlotIds should be recreated (all new)
      const newSlotIds = getSlotIdsForArray(model.state.items);
      expect(newSlotIds).toHaveLength(4);
      expect(newSlotIds![0]).not.toBe(initialSlotIdValues[0]);
      expect(newSlotIds![1]).not.toBe(initialSlotIdValues[1]);
      expect(newSlotIds![2]).not.toBe(initialSlotIdValues[2]);
      
      // Verify all slotIds are unique
      expect(new Set(newSlotIds).size).toBe(4);
    });

    it("multiple full replacements create fresh slotIds each time, always on live array", () => {
      const model = createModel({ items: [1, 2] });
      
      const arrayRef = model.state.items;
      
      // First replacement
      model.state.items = [10, 20, 30];
      expect(model.state.items).toBe(arrayRef);
      const firstReplaceSlotIds = getSlotIdsForArray(model.state.items);
      expect(firstReplaceSlotIds).toHaveLength(3);
      const firstIds = [...firstReplaceSlotIds!];
      
      // Second replacement
      model.state.items = [100, 200];
      expect(model.state.items).toBe(arrayRef);
      const secondReplaceSlotIds = getSlotIdsForArray(model.state.items);
      expect(secondReplaceSlotIds).toHaveLength(2);
      
      // SlotIds should be completely new (not reused from first replacement)
      expect(secondReplaceSlotIds![0]).not.toBe(firstIds[0]);
      expect(secondReplaceSlotIds![1]).not.toBe(firstIds[1]);
      expect(secondReplaceSlotIds![0]).not.toBe(firstIds[2]);
      
      // Third replacement with same elements
      model.state.items = [100, 200];
      expect(model.state.items).toBe(arrayRef);
      const thirdReplaceSlotIds = getSlotIdsForArray(model.state.items);
      expect(thirdReplaceSlotIds).toHaveLength(2);
      
      // Even with same content, slotIds should be recreated
      expect(thirdReplaceSlotIds![0]).not.toBe(secondReplaceSlotIds![0]);
      expect(thirdReplaceSlotIds![1]).not.toBe(secondReplaceSlotIds![1]);
    });

    it("sidecar remains on live array instance after replacement with different length", () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] });
      
      const arrayRef = model.state.items;
      
      // Replace with shorter array
      model.state.items = [10, 20];
      expect(model.state.items).toBe(arrayRef);
      const slotIdsAfterShorter = getSlotIdsForArray(model.state.items);
      expect(slotIdsAfterShorter).toHaveLength(2);
      
      // Replace with longer array
      model.state.items = [100, 200, 300, 400, 500, 600];
      expect(model.state.items).toBe(arrayRef);
      const slotIdsAfterLonger = getSlotIdsForArray(model.state.items);
      expect(slotIdsAfterLonger).toHaveLength(6);
      
      // Replace with empty array
      model.state.items = [];
      expect(model.state.items).toBe(arrayRef);
      const slotIdsAfterEmpty = getSlotIdsForArray(model.state.items);
      expect(slotIdsAfterEmpty).toHaveLength(0);
    });

    it("no sidecar exists for non-reactive plain arrays", () => {
      const plainArray = [1, 2, 3];
      
      const slotIds = getSlotIdsForArray(plainArray);
      expect(slotIds).toBeUndefined();
      
      // Even after mutations
      plainArray.push(4);
      const slotIdsAfterPush = getSlotIdsForArray(plainArray);
      expect(slotIdsAfterPush).toBeUndefined();
    });

    it("array reference stability across mixed operations", () => {
      const model = createModel({ items: [1, 2, 3] });
      
      const arrayRef = model.state.items;
      
      // Structural mutation
      model.state.items.push(4);
      expect(model.state.items).toBe(arrayRef);
      
      // Full replacement
      model.state.items = [10, 20, 30, 40, 50];
      expect(model.state.items).toBe(arrayRef);
      
      // Non-structural update
      model.state.items[2] = 999;
      expect(model.state.items).toBe(arrayRef);
      
      // Another structural mutation
      model.state.items.reverse();
      expect(model.state.items).toBe(arrayRef);
      
      // SlotIds should be aligned with current array state
      const finalSlotIds = getSlotIdsForArray(model.state.items);
      expect(finalSlotIds).toHaveLength(5);
      expect(model.state.items).toEqual([50, 40, 999, 20, 10]);
    });
  });});