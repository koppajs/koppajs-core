import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { domExtensions } from "../../src/utils/index.ts";

describe("domExtensions", () => {
  let container: HTMLElement;
  let element: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    element = document.createElement("div");
    element.id = "test-element";
    container.appendChild(element);
    document.body.appendChild(container);

    // Extensions should already be applied by extend() in other tests
    // If not, apply them here
    if (typeof (element as any).select !== "function") {
      Object.defineProperties(HTMLElement.prototype, domExtensions);
    }
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("select", () => {
    it("returns querySelector result for regular elements", () => {
      const child = document.createElement("span");
      child.className = "child";
      element.appendChild(child);

      const result = (element as any).select(".child");
      expect(result).toBe(child);
    });

    it("selects text for input elements", () => {
      const input = document.createElement("input");
      input.value = "test";
      container.appendChild(input);

      const _result = (input as any).select(".nonexistent");
      // For input elements, select() returns null after selecting text
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(4);
    });

    it("selects text for textarea elements", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "test";
      container.appendChild(textarea);

      const _result = (textarea as any).select(".nonexistent");
      // For textarea elements, select() returns null after selecting text
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(4);
    });
  });

  describe("selectAll", () => {
    it("returns querySelectorAll result", () => {
      const child1 = document.createElement("span");
      child1.className = "child";
      const child2 = document.createElement("span");
      child2.className = "child";
      element.appendChild(child1);
      element.appendChild(child2);

      const result = (element as any).selectAll(".child");
      expect(result.length).toBe(2);
      expect(result[0]).toBe(child1);
      expect(result[1]).toBe(child2);
    });
  });

  describe("addClass", () => {
    it("adds single class", () => {
      (element as any).addClass("test");
      expect(element.classList.contains("test")).toBe(true);
    });

    it("adds multiple classes", () => {
      (element as any).addClass("class1 class2 class3");
      expect(element.classList.contains("class1")).toBe(true);
      expect(element.classList.contains("class2")).toBe(true);
      expect(element.classList.contains("class3")).toBe(true);
    });

    it("handles extra whitespace", () => {
      // Note: The implementation splits by whitespace and trims, which may cause
      // empty strings. We test with minimal whitespace to avoid classList.add errors.
      (element as any).addClass(" class1  class2 ");
      expect(element.classList.contains("class1")).toBe(true);
      expect(element.classList.contains("class2")).toBe(true);
    });

    it("returns element for chaining", () => {
      const result = (element as any).addClass("test");
      expect(result).toBe(element);
    });
  });

  describe("removeClass", () => {
    it("removes single class", () => {
      element.classList.add("test");
      (element as any).removeClass("test");
      expect(element.classList.contains("test")).toBe(false);
    });

    it("removes multiple classes", () => {
      element.classList.add("class1", "class2", "class3");
      (element as any).removeClass("class1 class2");
      expect(element.classList.contains("class1")).toBe(false);
      expect(element.classList.contains("class2")).toBe(false);
      expect(element.classList.contains("class3")).toBe(true);
    });

    it("returns element for chaining", () => {
      const result = (element as any).removeClass("test");
      expect(result).toBe(element);
    });
  });

  describe("toggleClass", () => {
    it("adds class when not present", () => {
      (element as any).toggleClass("test");
      expect(element.classList.contains("test")).toBe(true);
    });

    it("removes class when present", () => {
      element.classList.add("test");
      (element as any).toggleClass("test");
      expect(element.classList.contains("test")).toBe(false);
    });

    it("toggles multiple classes", () => {
      element.classList.add("class1");
      (element as any).toggleClass("class1 class2");
      expect(element.classList.contains("class1")).toBe(false);
      expect(element.classList.contains("class2")).toBe(true);
    });

    it("returns element for chaining", () => {
      const result = (element as any).toggleClass("test");
      expect(result).toBe(element);
    });
  });

  describe("hasClass", () => {
    it("returns true when class is present", () => {
      element.classList.add("test");
      expect((element as any).hasClass("test")).toBe(true);
    });

    it("returns false when class is not present", () => {
      expect((element as any).hasClass("test")).toBe(false);
    });

    it("handles whitespace", () => {
      element.classList.add("test");
      expect((element as any).hasClass("  test  ")).toBe(true);
    });
  });

  describe("replaceWith", () => {
    it("replaces element with HTMLElement", () => {
      const newElement = document.createElement("span");
      newElement.textContent = "new";
      (element as any).replaceWith(newElement);

      expect(container.contains(element)).toBe(false);
      expect(container.contains(newElement)).toBe(true);
    });

    it("replaces element with string", () => {
      const _textNode = element.previousSibling;
      (element as any).replaceWith("text content");

      expect(container.contains(element)).toBe(false);
      expect(container.textContent).toContain("text content");
    });

    it("does nothing when element has no parent", () => {
      const orphan = document.createElement("div");
      const newElement = document.createElement("span");
      (orphan as any).replaceWith(newElement);

      expect(orphan.parentNode).toBeNull();
    });
  });

  describe("siblings", () => {
    it("returns all siblings", () => {
      const sibling1 = document.createElement("div");
      const sibling2 = document.createElement("div");
      container.appendChild(sibling1);
      container.appendChild(element);
      container.appendChild(sibling2);

      const siblings = (element as any).siblings();
      expect(siblings.length).toBe(2);
      expect(siblings).toContain(sibling1);
      expect(siblings).toContain(sibling2);
    });

    it("calls callback for each sibling", () => {
      const sibling1 = document.createElement("div");
      const sibling2 = document.createElement("div");
      container.appendChild(sibling1);
      container.appendChild(element);
      container.appendChild(sibling2);

      const called: HTMLElement[] = [];
      (element as any).siblings((sibling: HTMLElement) => {
        called.push(sibling);
      });

      expect(called.length).toBe(2);
      expect(called).toContain(sibling1);
      expect(called).toContain(sibling2);
    });

    it("returns empty array when no parent", () => {
      const orphan = document.createElement("div");
      const siblings = (orphan as any).siblings();
      expect(siblings).toEqual([]);
    });

    it("excludes text nodes", () => {
      container.appendChild(document.createTextNode("text"));
      container.appendChild(element);
      const sibling = document.createElement("div");
      container.appendChild(sibling);

      const siblings = (element as any).siblings();
      expect(siblings.length).toBe(1);
      expect(siblings[0]).toBe(sibling);
    });
  });

  describe("before", () => {
    it("inserts HTMLElement before element", () => {
      const newElement = document.createElement("span");
      (element as any).before(newElement);

      expect(container.firstChild).toBe(newElement);
      expect(container.children[1]).toBe(element);
    });

    it("inserts string before element", () => {
      (element as any).before("text content");

      // insertAdjacentHTML creates a text node, not an element
      expect(container.firstChild?.textContent).toContain("text content");
      expect(container.contains(element)).toBe(true);
    });

    it("does nothing when element has no parent", () => {
      const orphan = document.createElement("div");
      const newElement = document.createElement("span");
      (orphan as any).before(newElement);

      expect(orphan.parentNode).toBeNull();
    });
  });

  describe("after", () => {
    it("inserts HTMLElement after element", () => {
      const newElement = document.createElement("span");
      (element as any).after(newElement);

      expect(container.children[0]).toBe(element);
      expect(container.children[1]).toBe(newElement);
    });

    it("inserts string after element", () => {
      const nextSibling = document.createElement("div");
      container.appendChild(nextSibling);
      (element as any).after("text content");

      expect(element.nextSibling?.textContent).toContain("text content");
    });

    it("does nothing when element has no parent", () => {
      const orphan = document.createElement("div");
      const newElement = document.createElement("span");
      (orphan as any).after(newElement);

      expect(orphan.parentNode).toBeNull();
    });
  });

  describe("attr", () => {
    it("gets attribute value", () => {
      element.setAttribute("data-test", "value");
      expect((element as any).attr("data-test")).toBe("value");
    });

    it("returns null for non-existent attribute", () => {
      expect((element as any).attr("nonexistent")).toBeNull();
    });

    it("sets attribute when value is provided", () => {
      (element as any).attr("data-test", "value");
      expect(element.getAttribute("data-test")).toBe("value");
    });

    it("sets attribute to 'true' when value is empty string", () => {
      (element as any).attr("data-test", "");
      expect(element.getAttribute("data-test")).toBe("true");
    });
  });
});
