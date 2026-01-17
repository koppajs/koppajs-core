import { describe, it, expect, beforeEach } from "vitest";
import { reconcileDOM } from "../src/utils/reconcile";
import { setStructId, setSlotId } from "../src/utils/identity";

describe("reconcileDOM - identity-based matching", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  describe("positive: reorder preserves custom element references", () => {
    it("preserves custom element instances when reordered (non-loop context)", () => {
      // Initial render: create three custom elements with structIds
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      el1.setAttribute("data-order", "1");
      
      const el2 = document.createElement("my-element");
      setStructId(el2, "struct-2");
      el2.setAttribute("data-order", "2");
      
      const el3 = document.createElement("my-element");
      setStructId(el3, "struct-3");
      el3.setAttribute("data-order", "3");
      
      host.appendChild(el1);
      host.appendChild(el2);
      host.appendChild(el3);

      // Store references to verify instance preservation
      const ref1 = host.children[0];
      const ref2 = host.children[1];
      const ref3 = host.children[2];

      // Second render: reorder the elements (3, 1, 2)
      const fragment = document.createDocumentFragment();
      
      const newEl3 = document.createElement("my-element");
      setStructId(newEl3, "struct-3");
      newEl3.setAttribute("data-order", "3-updated");
      
      const newEl1 = document.createElement("my-element");
      setStructId(newEl1, "struct-1");
      newEl1.setAttribute("data-order", "1-updated");
      
      const newEl2 = document.createElement("my-element");
      setStructId(newEl2, "struct-2");
      newEl2.setAttribute("data-order", "2-updated");
      
      fragment.appendChild(newEl3);
      fragment.appendChild(newEl1);
      fragment.appendChild(newEl2);

      reconcileDOM(host, fragment, false);

      // Verify order changed
      expect(host.children.length).toBe(3);
      expect(host.children[0].getAttribute("data-order")).toBe("3-updated");
      expect(host.children[1].getAttribute("data-order")).toBe("1-updated");
      expect(host.children[2].getAttribute("data-order")).toBe("2-updated");

      // Verify instances are preserved (same object references)
      expect(host.children[0]).toBe(ref3); // struct-3 moved to first
      expect(host.children[1]).toBe(ref1); // struct-1 moved to second
      expect(host.children[2]).toBe(ref2); // struct-2 moved to third
    });

    it("preserves custom element instances when reordered (loop context with slotId)", () => {
      // Initial render: create elements in a loop with slotIds
      const el1 = document.createElement("list-item");
      setStructId(el1, "loop-struct");
      setSlotId(el1, "item-a");
      el1.setAttribute("value", "Item A");
      
      const el2 = document.createElement("list-item");
      setStructId(el2, "loop-struct");
      setSlotId(el2, "item-b");
      el2.setAttribute("value", "Item B");
      
      const el3 = document.createElement("list-item");
      setStructId(el3, "loop-struct");
      setSlotId(el3, "item-c");
      el3.setAttribute("value", "Item C");
      
      host.appendChild(el1);
      host.appendChild(el2);
      host.appendChild(el3);

      const ref1 = host.children[0];
      const ref2 = host.children[1];
      const ref3 = host.children[2];

      // Reorder: [b, c, a]
      const fragment = document.createDocumentFragment();
      
      const newEl2 = document.createElement("list-item");
      setStructId(newEl2, "loop-struct");
      setSlotId(newEl2, "item-b");
      newEl2.setAttribute("value", "Item B Updated");
      
      const newEl3 = document.createElement("list-item");
      setStructId(newEl3, "loop-struct");
      setSlotId(newEl3, "item-c");
      newEl3.setAttribute("value", "Item C Updated");
      
      const newEl1 = document.createElement("list-item");
      setStructId(newEl1, "loop-struct");
      setSlotId(newEl1, "item-a");
      newEl1.setAttribute("value", "Item A Updated");
      
      fragment.appendChild(newEl2);
      fragment.appendChild(newEl3);
      fragment.appendChild(newEl1);

      reconcileDOM(host, fragment, false);

      // Verify order and attributes updated
      expect(host.children[0].getAttribute("value")).toBe("Item B Updated");
      expect(host.children[1].getAttribute("value")).toBe("Item C Updated");
      expect(host.children[2].getAttribute("value")).toBe("Item A Updated");

      // Verify instances preserved
      expect(host.children[0]).toBe(ref2); // item-b
      expect(host.children[1]).toBe(ref3); // item-c
      expect(host.children[2]).toBe(ref1); // item-a
    });

    it("updates attributes while preserving instance during reorder", () => {
      const el1 = document.createElement("my-component");
      setStructId(el1, "comp-1");
      el1.setAttribute("value", "old-1");
      
      const el2 = document.createElement("my-component");
      setStructId(el2, "comp-2");
      el2.setAttribute("value", "old-2");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref1 = host.children[0];
      const ref2 = host.children[1];

      // Reorder and update attributes
      const fragment = document.createDocumentFragment();
      
      const newEl2 = document.createElement("my-component");
      setStructId(newEl2, "comp-2");
      newEl2.setAttribute("value", "new-2");
      newEl2.setAttribute("extra", "added");
      
      const newEl1 = document.createElement("my-component");
      setStructId(newEl1, "comp-1");
      newEl1.setAttribute("value", "new-1");
      
      fragment.appendChild(newEl2);
      fragment.appendChild(newEl1);

      reconcileDOM(host, fragment, false);

      // Instances preserved
      expect(host.children[0]).toBe(ref2);
      expect(host.children[1]).toBe(ref1);

      // Attributes updated
      expect(ref2.getAttribute("value")).toBe("new-2");
      expect(ref2.getAttribute("extra")).toBe("added");
      expect(ref1.getAttribute("value")).toBe("new-1");
    });
  });

  describe("negative: structId mismatch creates new instance", () => {
    it("replaces custom element when structId changes", () => {
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      el1.setAttribute("marker", "original");
      host.appendChild(el1);

      const originalRef = host.children[0];

      // New element with different structId
      const fragment = document.createDocumentFragment();
      const newEl = document.createElement("my-element");
      setStructId(newEl, "struct-2"); // Different structId
      newEl.setAttribute("marker", "replacement");
      fragment.appendChild(newEl);

      reconcileDOM(host, fragment, false);

      // Should be a different instance
      expect(host.children[0]).not.toBe(originalRef);
      expect(host.children[0].getAttribute("marker")).toBe("replacement");
    });

    it("creates new instance when structId is missing on new element", () => {
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      host.appendChild(el1);

      const originalRef = host.children[0];

      // New element without structId
      const fragment = document.createDocumentFragment();
      const newEl = document.createElement("my-element");
      // No setStructId call - undefined structId
      newEl.setAttribute("marker", "no-identity");
      fragment.appendChild(newEl);

      reconcileDOM(host, fragment, false);

      // Should be replaced (positional matching, same type)
      // Since neither has matching identity, it falls back to positional
      expect(host.children[0].getAttribute("marker")).toBe("no-identity");
    });

    it("replaces element when structIds don't match in a list", () => {
      const el1 = document.createElement("list-item");
      setStructId(el1, "item-1");
      
      const el2 = document.createElement("list-item");
      setStructId(el2, "item-2");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref1 = host.children[0];
      const ref2 = host.children[1];

      // Replace first item with different structId
      const fragment = document.createDocumentFragment();
      
      const newEl1 = document.createElement("list-item");
      setStructId(newEl1, "item-3"); // Different!
      
      const newEl2 = document.createElement("list-item");
      setStructId(newEl2, "item-2"); // Same
      
      fragment.appendChild(newEl1);
      fragment.appendChild(newEl2);

      reconcileDOM(host, fragment, false);

      // First should be replaced, second should be preserved
      expect(host.children[0]).not.toBe(ref1);
      expect(host.children[1]).toBe(ref2);
    });
  });

  describe("edge: slotId mismatch within same structId", () => {
    it("creates new instance when slotId differs but structId matches", () => {
      const el1 = document.createElement("loop-element");
      setStructId(el1, "loop-struct");
      setSlotId(el1, "slot-a");
      el1.setAttribute("marker", "original");
      host.appendChild(el1);

      const originalRef = host.children[0];

      // Same structId but different slotId
      const fragment = document.createDocumentFragment();
      const newEl = document.createElement("loop-element");
      setStructId(newEl, "loop-struct"); // Same structId
      setSlotId(newEl, "slot-b"); // Different slotId
      newEl.setAttribute("marker", "different-slot");
      fragment.appendChild(newEl);

      reconcileDOM(host, fragment, false);

      // Should create new instance due to slotId mismatch
      expect(host.children[0]).not.toBe(originalRef);
      expect(host.children[0].getAttribute("marker")).toBe("different-slot");
    });

    it("preserves instance when both structId and slotId match", () => {
      const el1 = document.createElement("loop-element");
      setStructId(el1, "loop-struct");
      setSlotId(el1, "slot-a");
      host.appendChild(el1);

      const originalRef = host.children[0];

      // Same structId and slotId
      const fragment = document.createDocumentFragment();
      const newEl = document.createElement("loop-element");
      setStructId(newEl, "loop-struct");
      setSlotId(newEl, "slot-a");
      newEl.setAttribute("updated", "true");
      fragment.appendChild(newEl);

      reconcileDOM(host, fragment, false);

      // Should preserve instance
      expect(host.children[0]).toBe(originalRef);
      expect(originalRef.getAttribute("updated")).toBe("true");
    });

    it("handles mixed slotId presence correctly", () => {
      // One element with slotId, one without (same structId)
      const el1 = document.createElement("my-element");
      setStructId(el1, "shared-struct");
      setSlotId(el1, "slot-1");
      
      const el2 = document.createElement("my-element");
      setStructId(el2, "shared-struct");
      // No slotId
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref1 = host.children[0];
      const ref2 = host.children[1];

      // Swap: element without slotId first, then with slotId
      const fragment = document.createDocumentFragment();
      
      const newEl2 = document.createElement("my-element");
      setStructId(newEl2, "shared-struct");
      // No slotId
      
      const newEl1 = document.createElement("my-element");
      setStructId(newEl1, "shared-struct");
      setSlotId(newEl1, "slot-1");
      
      fragment.appendChild(newEl2);
      fragment.appendChild(newEl1);

      reconcileDOM(host, fragment, false);

      // Both should be preserved but reordered
      expect(host.children[0]).toBe(ref2); // non-slotId moved first
      expect(host.children[1]).toBe(ref1); // slotId moved second
    });

    it("distinguishes elements in loop with different slotIds", () => {
      const items = ["a", "b", "c"].map(id => {
        const el = document.createElement("item-element");
        setStructId(el, "item-struct");
        setSlotId(el, id);
        el.setAttribute("data-id", id);
        return el;
      });

      items.forEach(el => host.appendChild(el));

      const refs = [host.children[0], host.children[1], host.children[2]];

      // Reorder: [c, a, b]
      const fragment = document.createDocumentFragment();
      ["c", "a", "b"].forEach(id => {
        const el = document.createElement("item-element");
        setStructId(el, "item-struct");
        setSlotId(el, id);
        el.setAttribute("data-id", id + "-updated");
        fragment.appendChild(el);
      });

      reconcileDOM(host, fragment, false);

      // Verify instances reordered correctly
      expect(host.children[0]).toBe(refs[2]); // c
      expect(host.children[1]).toBe(refs[0]); // a
      expect(host.children[2]).toBe(refs[1]); // b

      // Verify attributes updated
      expect(host.children[0].getAttribute("data-id")).toBe("c-updated");
      expect(host.children[1].getAttribute("data-id")).toBe("a-updated");
      expect(host.children[2].getAttribute("data-id")).toBe("b-updated");
    });
  });

  describe("mixed scenarios", () => {
    it("handles mix of custom elements with and without identity", () => {
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      
      const el2 = document.createElement("other-element");
      // No identity
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref1 = host.children[0];

      const fragment = document.createDocumentFragment();
      
      const newEl1 = document.createElement("my-element");
      setStructId(newEl1, "struct-1");
      newEl1.setAttribute("updated", "yes");
      
      const newEl2 = document.createElement("other-element");
      
      fragment.appendChild(newEl1);
      fragment.appendChild(newEl2);

      reconcileDOM(host, fragment, false);

      // Identity-based element preserved
      expect(host.children[0]).toBe(ref1);
      expect(ref1.getAttribute("updated")).toBe("yes");
    });

    it("handles adding new custom element with identity to list", () => {
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      host.appendChild(el1);

      const ref1 = host.children[0];

      // Add new element
      const fragment = document.createDocumentFragment();
      
      const newEl1 = document.createElement("my-element");
      setStructId(newEl1, "struct-1");
      
      const newEl2 = document.createElement("my-element");
      setStructId(newEl2, "struct-2");
      newEl2.setAttribute("marker", "new");
      
      fragment.appendChild(newEl1);
      fragment.appendChild(newEl2);

      reconcileDOM(host, fragment, false);

      expect(host.children.length).toBe(2);
      expect(host.children[0]).toBe(ref1); // Preserved
      expect(host.children[1].getAttribute("marker")).toBe("new");
    });

    it("handles removing custom element from list", () => {
      const el1 = document.createElement("my-element");
      setStructId(el1, "struct-1");
      
      const el2 = document.createElement("my-element");
      setStructId(el2, "struct-2");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref2 = host.children[1];

      // Keep only second
      const fragment = document.createDocumentFragment();
      const newEl2 = document.createElement("my-element");
      setStructId(newEl2, "struct-2");
      fragment.appendChild(newEl2);

      reconcileDOM(host, fragment, false);

      expect(host.children.length).toBe(1);
      expect(host.children[0]).toBe(ref2);
    });
  });

  describe("defensive: attribute-based fallback", () => {
    it("reads structId from attribute when not set via runtime helper and caches it", () => {
      // Initial render: create elements with structId in attribute only (not via setStructId)
      const el1 = document.createElement("my-element");
      el1.setAttribute("data-k-struct", "attr-struct-1");
      el1.setAttribute("data-order", "1");
      
      const el2 = document.createElement("my-element");
      el2.setAttribute("data-k-struct", "attr-struct-2");
      el2.setAttribute("data-order", "2");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const ref1 = host.children[0];
      const ref2 = host.children[1];

      // Second render: reorder elements, providing structAttr parameter
      const fragment = document.createDocumentFragment();
      
      const newEl2 = document.createElement("my-element");
      newEl2.setAttribute("data-k-struct", "attr-struct-2");
      newEl2.setAttribute("data-order", "2-updated");
      
      const newEl1 = document.createElement("my-element");
      newEl1.setAttribute("data-k-struct", "attr-struct-1");
      newEl1.setAttribute("data-order", "1-updated");
      
      fragment.appendChild(newEl2);
      fragment.appendChild(newEl1);

      // Pass structAttr parameter to enable fallback
      reconcileDOM(host, fragment, false, "data-k-struct");

      // Verify order changed
      expect(host.children.length).toBe(2);
      expect(host.children[0].getAttribute("data-order")).toBe("2-updated");
      expect(host.children[1].getAttribute("data-order")).toBe("1-updated");
      
      // Verify instances are preserved (same object references)
      expect(host.children[0]).toBe(ref2); // struct-2 moved to first
      expect(host.children[1]).toBe(ref1); // struct-1 moved to second
    });
  });

  describe("regression: attribute fallback without cached structId", () => {
    it("positive: reorder preserves instances using only struct attribute", () => {
      // Create two custom elements with data-k-struct attribute ONLY
      // Do NOT call setStructId - test the fallback path
      const el1 = document.createElement("custom-widget");
      el1.setAttribute("data-k-struct", "widget-alpha");
      el1.setAttribute("label", "Alpha");
      
      const el2 = document.createElement("custom-widget");
      el2.setAttribute("data-k-struct", "widget-beta");
      el2.setAttribute("label", "Beta");
      
      host.appendChild(el1);
      host.appendChild(el2);

      // Store references for instance verification
      const refAlpha = host.children[0];
      const refBeta = host.children[1];

      // Create new fragment with reordered elements (Beta, Alpha)
      const fragment = document.createDocumentFragment();
      
      const newBeta = document.createElement("custom-widget");
      newBeta.setAttribute("data-k-struct", "widget-beta");
      newBeta.setAttribute("label", "Beta Updated");
      
      const newAlpha = document.createElement("custom-widget");
      newAlpha.setAttribute("data-k-struct", "widget-alpha");
      newAlpha.setAttribute("label", "Alpha Updated");
      
      fragment.appendChild(newBeta);
      fragment.appendChild(newAlpha);

      // Reconcile with structAttr parameter (same path runtime uses)
      reconcileDOM(host, fragment, false, "data-k-struct");

      // Assertions: Order changes as expected
      expect(host.children.length).toBe(2);
      expect(host.children[0].getAttribute("label")).toBe("Beta Updated");
      expect(host.children[1].getAttribute("label")).toBe("Alpha Updated");
      
      // Assertions: Instances are preserved (===), moved not replaced
      expect(host.children[0]).toBe(refBeta);
      expect(host.children[1]).toBe(refAlpha);
    });

    it("negative: different data-k-struct value causes replacement", () => {
      // Create custom elements with data-k-struct attribute
      const el1 = document.createElement("custom-widget");
      el1.setAttribute("data-k-struct", "widget-one");
      el1.setAttribute("marker", "original");
      
      const el2 = document.createElement("custom-widget");
      el2.setAttribute("data-k-struct", "widget-two");
      el2.setAttribute("marker", "original");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const refOne = host.children[0];
      const refTwo = host.children[1];

      // Create fragment where first element has DIFFERENT struct value
      const fragment = document.createDocumentFragment();
      
      const newElDifferent = document.createElement("custom-widget");
      newElDifferent.setAttribute("data-k-struct", "widget-three"); // Different!
      newElDifferent.setAttribute("marker", "replacement");
      
      const newElTwo = document.createElement("custom-widget");
      newElTwo.setAttribute("data-k-struct", "widget-two"); // Same as el2
      newElTwo.setAttribute("marker", "updated");
      
      fragment.appendChild(newElDifferent);
      fragment.appendChild(newElTwo);

      // Reconcile with structAttr parameter
      reconcileDOM(host, fragment, false, "data-k-struct");

      // Assertions: First element should be replaced (different struct)
      expect(host.children[0]).not.toBe(refOne);
      expect(host.children[0].getAttribute("marker")).toBe("replacement");
      
      // Assertions: Second element should be preserved (same struct)
      expect(host.children[1]).toBe(refTwo);
      expect(refTwo.getAttribute("marker")).toBe("updated");
    });

    it("edge: missing attribute falls back to normal reconcile rules", () => {
      // Create elements where one has data-k-struct and one doesn't
      const el1 = document.createElement("custom-widget");
      el1.setAttribute("data-k-struct", "widget-with-struct");
      el1.setAttribute("marker", "has-struct");
      
      const el2 = document.createElement("custom-widget");
      // NO data-k-struct attribute on el2
      el2.setAttribute("marker", "no-struct");
      
      host.appendChild(el1);
      host.appendChild(el2);

      const refOne = host.children[0];
      const refTwo = host.children[1];

      // Create fragment where elements don't have the attribute
      const fragment = document.createDocumentFragment();
      
      const newEl1 = document.createElement("custom-widget");
      // NO data-k-struct attribute
      newEl1.setAttribute("marker", "new-first");
      
      const newEl2 = document.createElement("custom-widget");
      // NO data-k-struct attribute
      newEl2.setAttribute("marker", "new-second");
      
      fragment.appendChild(newEl1);
      fragment.appendChild(newEl2);

      // Reconcile with structAttr parameter
      reconcileDOM(host, fragment, false, "data-k-struct");

      // Assertions: Without identity attributes, should fall back to positional matching
      // Elements are same type (custom-widget), so they're updated in place
      expect(host.children.length).toBe(2);
      expect(host.children[0]).toBe(refOne); // Same instance, attributes updated
      expect(host.children[0].getAttribute("marker")).toBe("new-first");
      expect(host.children[1]).toBe(refTwo); // Same instance, attributes updated
      expect(host.children[1].getAttribute("marker")).toBe("new-second");
      
      // The data-k-struct attribute should be removed from first element
      expect(host.children[0].hasAttribute("data-k-struct")).toBe(false);
    });
  });
});
