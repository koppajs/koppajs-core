import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { processTemplate } from "../src/template-processor";
import type { State, Refs } from "../src/types";

describe("template-processor", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe("processTemplate", () => {
    it("replaces template strings in text nodes", async () => {
      const template = document.createElement("div");
      template.textContent = "Hello {{ name }}!";
      container.appendChild(template);

      const state: State = { name: "World" };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.textContent).toBe("Hello World!");
    });

    it("handles multiple template strings", async () => {
      const template = document.createElement("div");
      template.textContent = "{{ firstName }} {{ lastName }}";
      container.appendChild(template);

      const state: State = { firstName: "John", lastName: "Doe" };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.textContent).toBe("John Doe");
    });

    it("handles null and undefined values", async () => {
      const template = document.createElement("div");
      template.textContent = "Value: {{ value }}";
      container.appendChild(template);

      const state: State = { value: null };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.textContent).toBe("Value: ");
    });

    it("interpolates attributes", async () => {
      const template = document.createElement("div");
      template.setAttribute("data-id", "{{ id }}");
      template.setAttribute("class", "item-{{ index }}");
      container.appendChild(template);

      const state: State = { id: 123, index: 0 };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.getAttribute("data-id")).toBe("123");
      expect(template.getAttribute("class")).toBe("item-0");
    });

    it("collects ref elements", async () => {
      const template = document.createElement("div");
      const child = document.createElement("button");
      child.setAttribute("ref", "submitButton");
      template.appendChild(child);
      container.appendChild(template);

      const state: State = {};
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(refs.submitButton).toBe(child);
    });

    it("handles if directive - true condition", async () => {
      const template = document.createElement("div");
      const child = document.createElement("span");
      child.setAttribute("if", "show");
      child.textContent = "Visible";
      template.appendChild(child);
      container.appendChild(template);

      const state: State = { show: true };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(child.parentNode).toBe(template);
      expect(child.hasAttribute("if")).toBe(false);
      expect(child.textContent).toBe("Visible");
    });

    it("handles if directive - false condition", async () => {
      const template = document.createElement("div");
      const child = document.createElement("span");
      child.setAttribute("if", "show");
      child.textContent = "Hidden";
      template.appendChild(child);
      container.appendChild(template);

      const state: State = { show: false };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(child.parentNode).toBeNull();
    });

    it("handles else-if directive", async () => {
      const template = document.createElement("div");
      const ifEl = document.createElement("span");
      ifEl.setAttribute("if", "condition1");
      ifEl.textContent = "First";
      template.appendChild(ifEl);

      const elseIfEl = document.createElement("span");
      elseIfEl.setAttribute("else-if", "condition2");
      elseIfEl.textContent = "Second";
      template.appendChild(elseIfEl);

      container.appendChild(template);

      const state: State = { condition1: false, condition2: true };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(ifEl.parentNode).toBeNull();
      expect(elseIfEl.parentNode).toBe(template);
      expect(elseIfEl.hasAttribute("else-if")).toBe(false);
    });

    it("handles else directive", async () => {
      const template = document.createElement("div");
      const ifEl = document.createElement("span");
      ifEl.setAttribute("if", "condition");
      ifEl.textContent = "If";
      template.appendChild(ifEl);

      const elseEl = document.createElement("span");
      elseEl.setAttribute("else", "");
      elseEl.textContent = "Else";
      template.appendChild(elseEl);

      container.appendChild(template);

      const state: State = { condition: false };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(ifEl.parentNode).toBeNull();
      expect(elseEl.parentNode).toBe(template);
      expect(elseEl.hasAttribute("else")).toBe(false);
    });

    it("handles loop directive with object", async () => {
      const template = document.createElement("div");
      const item = document.createElement("div");
      item.setAttribute("loop", "item in items");
      item.textContent = "{{ item }} ({{ index }})";
      template.appendChild(item);
      container.appendChild(template);

      const state: State = {
        items: {
          a: "First",
          b: "Second",
          c: "Third",
        },
      };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      // Original element should be replaced
      expect(item.parentNode).toBeNull();

      // Should have 3 children
      const children = Array.from(template.children);
      expect(children.length).toBe(3);
      expect(children[0].textContent).toContain("First");
      expect(children[1].textContent).toContain("Second");
      expect(children[2].textContent).toContain("Third");
    });

    it("handles loop with if condition", async () => {
      const template = document.createElement("div");
      const item = document.createElement("div");
      item.setAttribute("loop", "item in items");
      item.setAttribute("if", "item.visible");
      item.textContent = "{{ item.name }}";
      template.appendChild(item);
      container.appendChild(template);

      const state: State = {
        items: {
          a: { name: "Visible", visible: true },
          b: { name: "Hidden", visible: false },
          c: { name: "Also Visible", visible: true },
        },
      };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      const children = Array.from(template.children);
      expect(children.length).toBe(2);
      expect(children[0].textContent).toBe("Visible");
      expect(children[1].textContent).toBe("Also Visible");
    });

    it("skips custom elements", async () => {
      const template = document.createElement("div");
      const customEl = document.createElement("my-custom-element");
      customEl.textContent = "{{ value }}";
      template.appendChild(customEl);
      container.appendChild(template);

      const state: State = { value: "test" };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      // Custom element content should not be processed
      expect(customEl.textContent).toBe("{{ value }}");
    });

    it("handles HTML in template strings", async () => {
      const template = document.createElement("div");
      template.textContent = "{{ html }}";
      container.appendChild(template);

      const state: State = { html: "<strong>Bold</strong>" };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.querySelector("strong")).not.toBeNull();
      expect(template.textContent).toBe("Bold");
    });

    it("handles nested template strings", async () => {
      const template = document.createElement("div");
      template.innerHTML = "<span>{{ inner }}</span>";
      container.appendChild(template);

      const state: State = { inner: "Nested" };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      expect(template.querySelector("span")?.textContent).toBe("Nested");
    });

    it("handles loop index variables", async () => {
      const template = document.createElement("div");
      const item = document.createElement("div");
      item.setAttribute("loop", "item in items");
      item.textContent = "{{ item }}: first={{ isFirst }}, last={{ isLast }}, even={{ isEven }}, odd={{ isOdd }}";
      template.appendChild(item);
      container.appendChild(template);

      const state: State = {
        items: {
          a: "A",
          b: "B",
          c: "C",
        },
      };
      const refs: Refs = {};

      await processTemplate(template, state, refs);

      const children = Array.from(template.children);
      expect(children[0].textContent).toContain("first=true");
      expect(children[0].textContent).toContain("last=false");
      expect(children[0].textContent).toContain("even=true");
      expect(children[0].textContent).toContain("odd=false");

      expect(children[2].textContent).toContain("first=false");
      expect(children[2].textContent).toContain("last=true");
      expect(children[2].textContent).toContain("even=true");
    });
  });
});

