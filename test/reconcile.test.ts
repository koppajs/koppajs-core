import { describe, it, expect, beforeEach } from "vitest";
import { reconcileDOM } from "../src/utils/reconcile";

describe("reconcileDOM", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  describe("first render", () => {
    it("appends all content on first render", () => {
      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      div.textContent = "Hello";
      fragment.appendChild(div);

      reconcileDOM(host, fragment, true);

      expect(host.innerHTML).toBe("<div>Hello</div>");
    });

    it("handles empty fragment on first render", () => {
      const fragment = document.createDocumentFragment();

      reconcileDOM(host, fragment, true);

      expect(host.innerHTML).toBe("");
    });

    it("handles multiple elements on first render", () => {
      const fragment = document.createDocumentFragment();
      const div1 = document.createElement("div");
      div1.textContent = "First";
      const div2 = document.createElement("div");
      div2.textContent = "Second";
      fragment.appendChild(div1);
      fragment.appendChild(div2);

      reconcileDOM(host, fragment, true);

      expect(host.children.length).toBe(2);
      expect(host.children[0].textContent).toBe("First");
      expect(host.children[1].textContent).toBe("Second");
    });
  });

  describe("subsequent renders", () => {
    it("updates text content without replacing elements", () => {
      // Initial render
      host.innerHTML = "<div>Old</div>";
      const originalDiv = host.firstElementChild;

      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      div.textContent = "New";
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      // Element should be preserved, content updated
      expect(host.firstElementChild).toBe(originalDiv);
      expect(host.innerHTML).toBe("<div>New</div>");
    });

    it("updates attributes without replacing elements", () => {
      host.innerHTML = '<div class="old" id="test"></div>';
      const originalDiv = host.firstElementChild;

      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      div.className = "new";
      div.id = "test";
      div.setAttribute("data-new", "value");
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      expect(host.firstElementChild).toBe(originalDiv);
      expect(originalDiv?.className).toBe("new");
      expect(originalDiv?.getAttribute("data-new")).toBe("value");
    });

    it("removes extra children", () => {
      host.innerHTML = "<div>First</div><div>Second</div><div>Third</div>";

      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      div.textContent = "Only";
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      expect(host.children.length).toBe(1);
      expect(host.innerHTML).toBe("<div>Only</div>");
    });

    it("adds new children", () => {
      host.innerHTML = "<div>First</div>";

      const fragment = document.createDocumentFragment();
      const div1 = document.createElement("div");
      div1.textContent = "First";
      const div2 = document.createElement("div");
      div2.textContent = "Second";
      fragment.appendChild(div1);
      fragment.appendChild(div2);

      reconcileDOM(host, fragment, false);

      expect(host.children.length).toBe(2);
      expect(host.children[1].textContent).toBe("Second");
    });

    it("replaces elements with different tag names", () => {
      host.innerHTML = "<div>Content</div>";

      const fragment = document.createDocumentFragment();
      const span = document.createElement("span");
      span.textContent = "New Content";
      fragment.appendChild(span);

      reconcileDOM(host, fragment, false);

      expect(host.innerHTML).toBe("<span>New Content</span>");
    });

    it("handles nested elements", () => {
      host.innerHTML = "<div><span>Inner</span></div>";
      const originalDiv = host.firstElementChild;
      const originalSpan = originalDiv?.firstElementChild;

      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      const span = document.createElement("span");
      span.textContent = "Updated Inner";
      div.appendChild(span);
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      // Outer and inner elements should be preserved
      expect(host.firstElementChild).toBe(originalDiv);
      expect(originalDiv?.firstElementChild).toBe(originalSpan);
      expect(originalSpan?.textContent).toBe("Updated Inner");
    });

    it("preserves custom element references", () => {
      // Create a mock custom element by adding hyphen to tag name
      const customEl = document.createElement("my-component");
      customEl.textContent = "Custom";
      host.appendChild(customEl);

      const fragment = document.createDocumentFragment();
      const newCustomEl = document.createElement("my-component");
      newCustomEl.textContent = "Custom"; // Same content
      newCustomEl.setAttribute("prop", "value"); // New attribute
      fragment.appendChild(newCustomEl);

      reconcileDOM(host, fragment, false);

      // Custom element should be preserved (same instance)
      expect(host.firstElementChild).toBe(customEl);
      // Attributes should be updated
      expect(customEl.getAttribute("prop")).toBe("value");
    });

    it("does not recurse into custom element children", () => {
      // Custom elements manage their own children
      const customEl = document.createElement("my-component");
      customEl.innerHTML = "<div>Internal Content</div>";
      host.appendChild(customEl);

      const fragment = document.createDocumentFragment();
      const newCustomEl = document.createElement("my-component");
      // Different internal content (should be ignored)
      newCustomEl.innerHTML = "<span>Different Content</span>";
      fragment.appendChild(newCustomEl);

      reconcileDOM(host, fragment, false);

      // Custom element should be preserved
      expect(host.firstElementChild).toBe(customEl);
      // Internal content should NOT be changed (custom element manages it)
      expect(customEl.innerHTML).toBe("<div>Internal Content</div>");
    });
  });

  describe("edge cases", () => {
    it("handles text nodes correctly", () => {
      host.innerHTML = "Old Text";

      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode("New Text"));

      reconcileDOM(host, fragment, false);

      expect(host.textContent).toBe("New Text");
    });

    it("handles mixed text and element nodes", () => {
      host.innerHTML = "Text<div>Element</div>";

      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode("Updated Text"));
      const div = document.createElement("div");
      div.textContent = "Updated Element";
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      expect(host.textContent).toBe("Updated TextUpdated Element");
    });

    it("handles empty host on non-first render", () => {
      // Host is empty but isFirstRender is false
      const fragment = document.createDocumentFragment();
      const div = document.createElement("div");
      div.textContent = "Content";
      fragment.appendChild(div);

      reconcileDOM(host, fragment, false);

      // Should fall back to replaceChildren behavior
      expect(host.innerHTML).toBe("<div>Content</div>");
    });
  });
});
