import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyLoop } from "../src/template-processor";
import { createModel, getSlotIdsForArray } from "../src/model";
import { getSlotId } from "../src/utils/identity";

/**
 * Test suite for template-processor loop slot identity with model sidecar integration.
 * Tests verify that slotIds from reactive array sidecars are correctly attached to DOM elements.
 *
 * Three Test Rule:
 * - Positive: Loop over reactive array attaches slotIds matching model sidecar order
 * - Negative: Loop over plain non-reactive array does not attach slotIds
 * - Edge: After reordering reactive array, slotIds reflect new sidecar order (no index-based stability)
 */
describe("template-processor loop slotId with model sidecar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = "";
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("positive: loop over reactive array attaches slotIds from model sidecar", async () => {
    // Create a reactive model with an array
    const model = createModel({ items: ["alpha", "beta", "gamma"] });
    const state = { items: model.state.items };
    const refs = {};

    // Get the slotIds from the model sidecar
    const expectedSlotIds = getSlotIdsForArray(model.state.items);
    expect(expectedSlotIds).toBeDefined();
    expect(expectedSlotIds?.length).toBe(3);

    // Set up loop template
    container.innerHTML = '<span loop="item in items">{{item}}</span>';

    // Process the loop
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);

    // Verify that the DOM nodes have slotIds attached
    const nodes = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    ) as HTMLElement[];
    expect(nodes.length).toBe(3);

    // Get slotIds from DOM nodes
    const actualSlotIds = nodes.map((n) => getSlotId(n));

    // Verify they match the model sidecar order
    expect(actualSlotIds).toEqual(expectedSlotIds);
    expect(actualSlotIds.every((id) => id !== undefined)).toBe(true);
  });

  it("negative: loop over plain non-reactive array does not attach slotIds", async () => {
    // Use a plain, non-reactive array
    const plainArray = ["x", "y", "z"];
    const state = { items: plainArray };
    const refs = {};

    // Verify no sidecar exists for plain array
    const slotIds = getSlotIdsForArray(plainArray);
    expect(slotIds).toBeUndefined();

    // Set up loop template
    container.innerHTML = '<span loop="item in items">{{item}}</span>';

    // Process the loop
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);

    // Verify that DOM nodes were created but without slotIds
    const nodes = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    ) as HTMLElement[];
    expect(nodes.length).toBe(3);

    // Get slotIds from DOM nodes - should all be undefined
    const actualSlotIds = nodes.map((n) => getSlotId(n));
    expect(actualSlotIds.every((id) => id === undefined)).toBe(true);
  });

  it("edge: after reordering reactive array, slotIds reflect new sidecar order", async () => {
    // Create a reactive model with an array
    const model = createModel({ items: [1, 2, 3, 4] });
    const state = { items: model.state.items };
    const refs = {};

    // Get initial slotIds from the model sidecar
    const initialSlotIds = getSlotIdsForArray(model.state.items);
    expect(initialSlotIds).toBeDefined();
    expect(initialSlotIds?.length).toBe(4);

    // Store a copy of the initial order for comparison
    const initialSlotIdsSnapshot = [...initialSlotIds!];

    // First render
    container.innerHTML = '<span loop="item in items">{{item}}</span>';
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);

    const nodes1 = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    ) as HTMLElement[];
    const slotIds1 = nodes1.map((n) => getSlotId(n));
    expect(slotIds1).toEqual(initialSlotIdsSnapshot);

    // Reverse the array (mutates the reactive array and its sidecar)
    model.state.items.reverse();

    // Get slotIds after reverse - should be in reversed order
    const reversedSlotIds = getSlotIdsForArray(model.state.items);
    expect(reversedSlotIds).toBeDefined();
    expect(reversedSlotIds?.length).toBe(4);

    // Verify the sidecar was actually reversed (not index-stable)
    // The sidecar should be in reversed order compared to the initial snapshot
    expect(reversedSlotIds).toEqual([...initialSlotIdsSnapshot].reverse());

    // Re-render the loop
    container.innerHTML = '<span loop="item in items">{{item}}</span>';
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);

    // Verify the DOM slotIds reflect the new sidecar order
    const nodes2 = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    ) as HTMLElement[];
    const slotIds2 = nodes2.map((n) => getSlotId(n));

    // SlotIds should match the reversed sidecar, NOT the original order
    expect(slotIds2).toEqual(reversedSlotIds);
    expect(slotIds2).toEqual([...initialSlotIdsSnapshot].reverse());
  });
});
