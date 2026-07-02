import { describe, expect, it } from "vitest";
import { buildSearchResults } from "./documentSearch";

describe("documentSearch utility", () => {
  it("returns matching pages with snippets and counts", () => {
    const results = buildSearchResults(
      [
        { pageNumber: 1, text: "Hello world. This page mentions export once." },
        { pageNumber: 2, text: "No match on this page." },
        { pageNumber: 3, text: "Export again here. export twice." },
      ],
      "export"
    );

    expect(results).toHaveLength(2);
    expect(results[0].pageNumber).toBe(1);
    expect(results[0].matchCount).toBe(1);
    expect(results[0].snippet.toLowerCase()).toContain("export once");
    expect(results[1].pageNumber).toBe(3);
    expect(results[1].matchCount).toBe(2);
  });

  it("ignores empty queries and trims whitespace", () => {
    expect(buildSearchResults([{ pageNumber: 1, text: "Anything" }], "   ")).toEqual([]);
    expect(buildSearchResults([{ pageNumber: 1, text: "Trimmed query" }], " trimmed ")).toHaveLength(1);
  });
});
