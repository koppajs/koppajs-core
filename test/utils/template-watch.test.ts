import { describe, it, expect } from "vitest";
import { extractWatchListFromTemplate } from "../../src/utils/index.ts";

describe("template-watch", () => {
  describe("extractWatchListFromTemplate", () => {
    it("extracts simple property paths", () => {
      const template = "{{ name }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("name");
    });

    it("extracts nested property paths", () => {
      const template = "{{ user.name }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("user.name");
    });

    it("extracts multiple paths", () => {
      const template = "{{ name }} {{ age }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("name");
      expect(result).toContain("age");
    });

    it("removes duplicates", () => {
      const template = "{{ name }} {{ name }}";
      const result = extractWatchListFromTemplate(template);
      expect(result.filter((x) => x === "name")).toHaveLength(1);
    });

    it("handles array access", () => {
      const template = "{{ items[0].name }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("items[0].name");
    });

    it("handles complex expressions", () => {
      const template = "{{ user.name + ' ' + user.surname }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("user.name");
      expect(result).toContain("user.surname");
    });

    it("returns empty array for no expressions", () => {
      const template = "<div>No expressions</div>";
      const result = extractWatchListFromTemplate(template);
      expect(result).toEqual([]);
    });

    it("handles optional chaining", () => {
      const template = "{{ user?.name }}";
      const result = extractWatchListFromTemplate(template);
      expect(result).toContain("user.name");
    });
  });
});
