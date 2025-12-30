import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setupEvents,
  bindNativeEvents,
  setupEventsForComposite,
  bindNativeEventsForComposite,
} from "../src/event-handler";
import type { State, Methods, Events, Refs } from "../src/types";

describe("event-handler", () => {
  let container: DocumentFragment;
  let refs: Refs;

  beforeEach(() => {
    container = document.createDocumentFragment();
    refs = {};
  });

  describe("setupEvents", () => {
    it("attaches event listener to window", () => {
      const handler = vi.fn();
      const events: Events = [["click", "window", handler]];
      const userContext: State = {};

      setupEvents(userContext, events, container, refs);

      window.dispatchEvent(new Event("click"));
      expect(handler).toHaveBeenCalled();
    });

    it("attaches event listener to selector", () => {
      const element = document.createElement("div");
      element.className = "test";
      container.appendChild(element);
      const handler = vi.fn();
      const events: Events = [["click", ".test", handler]];
      const userContext: State = {};

      setupEvents(userContext, events, container, refs);

      element.dispatchEvent(new Event("click", { bubbles: true }));
      expect(handler).toHaveBeenCalled();
    });

    it("handles ref-based selectors", () => {
      const element = document.createElement("div");
      refs.button = element;
      const handler = vi.fn();
      const events: Events = [["click", { ref: "button" }, handler]];
      const userContext: State = {};

      setupEvents(userContext, events, container, refs);

      element.dispatchEvent(new Event("click", { bubbles: true }));
      expect(handler).toHaveBeenCalled();
    });

    it("handles ref with selector", () => {
      const parent = document.createElement("div");
      const child = document.createElement("button");
      child.className = "btn";
      parent.appendChild(child);
      refs.container = parent;
      const handler = vi.fn();
      const events: Events = [["click", { ref: "container", selector: ".btn" }, handler]];
      const userContext: State = {};

      setupEvents(userContext, events, container, refs);

      child.dispatchEvent(new Event("click", { bubbles: true }));
      expect(handler).toHaveBeenCalled();
    });

    it("ignores invalid events", () => {
      const events: Events = [["click", "window", null as any]];
      const userContext: State = {};

      expect(() => setupEvents(userContext, events, container, refs)).not.toThrow();
    });
  });

  describe("bindNativeEvents", () => {
    it("binds onclick handler", () => {
      const element = document.createElement("div");
      element.setAttribute("onclick", "handleClick");
      container.appendChild(element);
      const userContext: State = {
        handleClick: vi.fn(),
      };

      bindNativeEvents(userContext, container);

      element.click();
      expect(userContext.handleClick).toHaveBeenCalled();
    });

    it("removes onclick attribute after binding", () => {
      const element = document.createElement("div");
      element.setAttribute("onclick", "handleClick");
      container.appendChild(element);
      const userContext: State = {
        handleClick: vi.fn(),
      };

      bindNativeEvents(userContext, container);

      expect(element.hasAttribute("onclick")).toBe(false);
    });
  });

  describe("setupEventsForComposite", () => {
    it("attaches events for composite type", () => {
      const element = document.createElement("div");
      element.className = "test";
      container.appendChild(element);
      const handler = vi.fn();
      const events: Events = [["click", ".test", handler]];
      const methods: Methods = {};
      const state: State = {};

      setupEventsForComposite(methods, state, events, container, refs);

      element.dispatchEvent(new Event("click", { bubbles: true }));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("bindNativeEventsForComposite", () => {
    it("binds native events for composite type", () => {
      const element = document.createElement("div");
      element.setAttribute("onclick", "handleClick");
      container.appendChild(element);
      const methods: Methods = {
        handleClick: vi.fn(),
      };

      bindNativeEventsForComposite(methods, container);

      element.click();
      expect(methods.handleClick).toHaveBeenCalled();
    });
  });
});


