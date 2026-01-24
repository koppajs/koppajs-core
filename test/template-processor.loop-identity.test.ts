import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyLoop } from "../src/template-processor";
import { getSlotId } from "../src/utils/identity";
import { createModel } from "../src/model";

describe("template-processor loop identity", () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = "";
  });
  afterEach(() => {
    document.body.removeChild(container);
  });
  it("attaches distinct slotIds per iteration node for array", async () => {
    container.innerHTML = '<span loop="item in items">{{item}}</span>';
    const model = createModel({ items: ["a", "b", "c"] });
    const state = { items: model.state.items };
    const refs = {};
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);
    const nodes = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    );
    expect(nodes.length).toBe(3);
    const slotIds = nodes.map((n) => getSlotId(n));
    expect(new Set(slotIds).size).toBe(3);
    expect(slotIds.every((id) => id !== undefined)).toBe(true);
  });

  it("does not attach slotIds for object iteration", async () => {
    container.innerHTML = '<span loop="key in obj">{{key}}</span>';
    const state = { obj: { a: 1, b: 2 } };
    const refs = {};
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);
    const nodes = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    );
    expect(nodes.length).toBe(2);
    const slotIds = nodes.map((n) => getSlotId(n));
    expect(slotIds.every((id) => id === undefined)).toBe(true);
  });

  it("preserves slotIds ordering for same array instance", async () => {
    container.innerHTML = '<span loop="item in items">{{item}}</span>';
    const model = createModel({ items: ["x", "y", "z"] });
    const state = { items: model.state.items };
    const refs = {};
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);
    const nodes1 = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    );
    const slotIds1 = nodes1.map((n) => getSlotId(n));
    // Re-process with same array
    container.innerHTML = '<span loop="item in items">{{item}}</span>';
    await applyLoop(container.firstElementChild as HTMLElement, state, refs);
    const nodes2 = Array.from(container.childNodes).filter(
      (n) => n instanceof HTMLElement,
    );
    const slotIds2 = nodes2.map((n) => getSlotId(n));
    expect(slotIds1).toEqual(slotIds2);
  });
});
