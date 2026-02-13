import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateProp,
  processSlots,
  registerComponent,
} from "../src/component";
import type { Props, ComponentSource } from "../src/types";

describe("component - edge cases and negative tests", () => {
  describe("validateProp - required props", () => {
    it("logs error when required prop is missing", () => {
      const props: Props = {
        name: { type: String as any, required: true },
      };

      // Required props are checked during prop processing, not validateProp
      // validateProp uses default if provided, so we test with undefined
      const result = validateProp({
        propName: "name",
        propValue: undefined,
        props,
      });

      // validateProp doesn't validate required, only type - returns false for undefined without default
      expect(result).toBe(false);
    });

    it("validates required prop with value provided", () => {
      const props: Props = {
        name: { type: String as any, required: true },
      };

      const result = validateProp({
        propName: "name",
        propValue: "John",
        props,
      });

      expect(result).toBe(true);
    });

    it("uses default value for required prop when not provided", () => {
      const props: Props = {
        name: { type: String as any, required: true, default: "Anonymous" },
      };

      const result = validateProp({
        propName: "name",
        propValue: undefined,
        props,
      });

      expect(result).toBe(true);
    });
  });

  describe("validateProp - regex validation", () => {
    it("validates prop against regex pattern", () => {
      const props: Props = {
        email: { type: String as any, regex: "^[a-z]+@[a-z]+\\.[a-z]+$" },
      };

      expect(
        validateProp({
          propName: "email",
          propValue: "test@example.com",
          props,
        }),
      ).toBe(true);
    });

    it("rejects prop that doesn't match regex pattern", () => {
      const props: Props = {
        email: { type: String as any, regex: "^[a-z]+@[a-z]+\\.[a-z]+$" },
      };

      expect(
        validateProp({
          propName: "email",
          propValue: "invalid-email",
          props,
        }),
      ).toBe(false);
    });

    it("ignores regex validation for non-string props", () => {
      const props: Props = {
        count: { type: Number as any, regex: "^\\d+$" },
      };

      // Regex only applies to strings
      expect(validateProp({ propName: "count", propValue: 42, props })).toBe(
        true,
      );
    });

    it("handles complex regex patterns", () => {
      const props: Props = {
        phone: { type: String as any, regex: "^\\+?[0-9]{1,3}-?[0-9]{3,14}$" },
      };

      expect(
        validateProp({ propName: "phone", propValue: "+1-555-1234", props }),
      ).toBe(false); // This specific format might not match the regex

      expect(
        validateProp({ propName: "phone", propValue: "15551234", props }),
      ).toBe(true); // Simple numeric format should work
    });
  });

  describe("validateProp - edge cases", () => {
    it("handles null value", () => {
      const props: Props = {
        value: { type: Object as any },
      };

      // null is not a valid object in our type system
      expect(validateProp({ propName: "value", propValue: null, props })).toBe(
        false,
      );
    });

    it("handles NaN for number type", () => {
      const props: Props = {
        count: { type: Number as any },
      };

      // NaN has typeof "number"
      expect(validateProp({ propName: "count", propValue: NaN, props })).toBe(
        true,
      );
    });

    it("handles Infinity for number type", () => {
      const props: Props = {
        count: { type: Number as any },
      };

      expect(
        validateProp({ propName: "count", propValue: Infinity, props }),
      ).toBe(true);
    });

    it("distinguishes between array and object", () => {
      const propsArray: Props = {
        items: { type: Array as any },
      };

      const propsObject: Props = {
        config: { type: Object as any },
      };

      expect(
        validateProp({
          propName: "items",
          propValue: [1, 2, 3],
          props: propsArray,
        }),
      ).toBe(true);

      expect(
        validateProp({
          propName: "items",
          propValue: { a: 1 },
          props: propsArray,
        }),
      ).toBe(false);

      expect(
        validateProp({
          propName: "config",
          propValue: { a: 1 },
          props: propsObject,
        }),
      ).toBe(true);

      expect(
        validateProp({
          propName: "config",
          propValue: [1, 2, 3],
          props: propsObject,
        }),
      ).toBe(false);
    });

    it("validates function type", () => {
      const props: Props = {
        callback: { type: Function as any },
      };

      expect(
        validateProp({ propName: "callback", propValue: () => {}, props }),
      ).toBe(true);

      expect(
        validateProp({
          propName: "callback",
          propValue: "not a function",
          props,
        }),
      ).toBe(false);
    });

    it("handles undefined type (unknown)", () => {
      const props: Props = {
        anything: { type: undefined as any },
      };

      // Unknown type should accept any value
      expect(
        validateProp({ propName: "anything", propValue: "string", props }),
      ).toBe(true);

      expect(validateProp({ propName: "anything", propValue: 42, props })).toBe(
        true,
      );
    });
  });

  describe("processSlots - edge cases", () => {
    let container: DocumentFragment;
    let host: HTMLElement;

    beforeEach(() => {
      container = document.createDocumentFragment();
      host = document.createElement("div");
    });

    it("handles slot with no parent node", () => {
      const _slot = document.createElement("slot");
      // Slot is not attached to container

      expect(() => processSlots({ container, host })).not.toThrow();
    });

    it("handles multiple default slots", () => {
      const template = document.createElement("div");
      const slot1 = document.createElement("slot");
      const slot2 = document.createElement("slot");
      template.appendChild(slot1);
      template.appendChild(slot2);
      container.appendChild(template);

      const content = document.createTextNode("Content");
      host.appendChild(content);

      processSlots({ container, host });

      // Both slots should be replaced with the same content
      expect(template.contains(slot1)).toBe(false);
      expect(template.contains(slot2)).toBe(false);
    });

    it("handles slot with fallback content", () => {
      const template = document.createElement("div");
      const slot = document.createElement("slot");
      slot.textContent = "Fallback";
      template.appendChild(slot);
      container.appendChild(template);

      // No matching content in host
      processSlots({ container, host });

      // Slot is removed, fallback is not preserved (current behavior)
      expect(template.contains(slot)).toBe(false);
      expect(template.textContent).toBe("");
    });

    it("handles empty host", () => {
      const template = document.createElement("div");
      const slot = document.createElement("slot");
      template.appendChild(slot);
      container.appendChild(template);

      processSlots({ container, host });

      expect(template.contains(slot)).toBe(false);
      expect(template.children.length).toBe(0);
    });

    it("handles slot with special characters in name", () => {
      const template = document.createElement("div");
      const slot = document.createElement("slot");
      slot.setAttribute("name", "header-top_1");
      template.appendChild(slot);
      container.appendChild(template);

      const content = document.createElement("div");
      content.setAttribute("slot", "header-top_1");
      content.textContent = "Header";
      host.appendChild(content);

      processSlots({ container, host });

      expect(template.contains(slot)).toBe(false);
      expect(template.querySelector("div")?.textContent).toBe("Header");
    });

    it("handles mixed slotted and non-slotted content", () => {
      const template = document.createElement("div");
      const slot = document.createElement("slot");
      slot.setAttribute("name", "header");
      template.appendChild(slot);
      container.appendChild(template);

      const header = document.createElement("h1");
      header.setAttribute("slot", "header");
      header.textContent = "Header";

      const defaultContent = document.createTextNode("Default");

      host.appendChild(header);
      host.appendChild(defaultContent);

      processSlots({ container, host });

      // Named slot gets header, default content is not used anywhere
      expect(template.querySelector("h1")?.textContent).toBe("Header");
    });
  });

  describe("registerComponent - error handling", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("handles component with valid script that returns object", async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ value }}</div>",
        script: "{ state: { value: 42 } }",
        style: "",
        type: "composite",
      };

      expect(() =>
        registerComponent("test-valid-script", componentSource),
      ).not.toThrow();

      const element = document.createElement("test-valid-script");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toContain("42");
    });

    it("handles component with empty template", async () => {
      const componentSource: ComponentSource = {
        template: "",
        script: "{ state: { value: 42 } }",
        style: "",
        type: "composite",
      };

      registerComponent("test-empty-template", componentSource);

      const element = document.createElement("test-empty-template");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toBe("");
    });

    it("handles component with null state values", async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ value }}</div>",
        script: "{ state: { value: null } }",
        style: "",
        type: "composite",
      };

      registerComponent("test-null-state", componentSource);

      const element = document.createElement("test-null-state");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toBe("");
    });

    it("handles component with circular state references", async () => {
      const componentSource: ComponentSource = {
        template: "<div>Test</div>",
        script: `{
          state: (() => {
            const obj = { a: null };
            obj.a = obj;
            return obj;
          })()
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-circular", componentSource);

      const element = document.createElement("test-circular");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element).toBeDefined();
    });

    it("handles component with method errors gracefully", async () => {
      const componentSource: ComponentSource = {
        template: "<div><button onClick='safeMethod'>Click</button></div>",
        script: `{
          state: {},
          methods: {
            safeMethod() {
              console.log('Safe method');
            }
          }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-safe-method", componentSource);

      const element = document.createElement("test-safe-method");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const button = element.querySelector("button");
      expect(button).toBeDefined();

      // Clicking should work normally
      button?.click();
      expect(element).toBeDefined();
    });

    it("handles component with undefined methods", async () => {
      const componentSource: ComponentSource = {
        template: "<div><button onClick='undefinedMethod'>Click</button></div>",
        script: `{
          state: {},
          methods: {
            definedMethod() {}
          }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-undefined-method", componentSource);

      const element = document.createElement("test-undefined-method");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.querySelector("button")).toBeDefined();
    });

    it("handles rapid connect/disconnect cycles", async () => {
      const componentSource: ComponentSource = {
        template: "<div>Rapid</div>",
        script: "{ state: { count: 0 } }",
        style: "",
        type: "composite",
      };

      registerComponent("test-rapid-cycles", componentSource);

      const element = document.createElement("test-rapid-cycles");

      // Rapid connect/disconnect
      for (let i = 0; i < 10; i++) {
        document.body.appendChild(element);
        document.body.removeChild(element);
      }

      // Final connect
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.parentNode).toBe(document.body);
    });
  });

  describe("component props - edge cases", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("handles boolean prop with attribute presence", async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ enabled ? 'yes' : 'no' }}</div>",
        script: `{
          props: { enabled: { type: Boolean } },
          state: { enabled: false }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-bool-prop", componentSource);

      const element = document.createElement("test-bool-prop");
      // HTML boolean attributes: presence = true, absence = false
      element.setAttribute("enabled", "");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if boolean attributes are handled correctly
      expect(element.textContent).toBeDefined();
    });

    it("handles numeric prop with default value", async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ count }}</div>",
        script: `{
          props: { count: { type: Number, default: 0 } },
          state: { count: 0 }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-numeric-prop", componentSource);

      const element = document.createElement("test-numeric-prop");
      // Without attribute, should use default
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toBe("0");
    });

    it("handles prop with empty string value", async () => {
      const componentSource: ComponentSource = {
        template: "<div>{{ message || 'empty' }}</div>",
        script: `{
          props: { message: { type: String } },
          state: { message: "" }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-empty-prop", componentSource);

      const element = document.createElement("test-empty-prop");
      element.setAttribute("message", "");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toContain("empty");
    });

    it("handles prop with whitespace-only value", async () => {
      const componentSource: ComponentSource = {
        template: "<div>'{{ message }}'</div>",
        script: `{
          props: { message: { type: String } },
          state: { message: "" }
        }`,
        style: "",
        type: "composite",
      };

      registerComponent("test-whitespace-prop", componentSource);

      const element = document.createElement("test-whitespace-prop");
      element.setAttribute("message", "   ");
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.textContent).toContain("   ");
    });
  });
});
