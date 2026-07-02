import { describe, expect, it } from "vitest";
import { buildExportName, buildTimestampSuffix } from "./exportNames";

describe("exportNames utility", () => {
  it("builds a stable timestamp suffix from a provided date", () => {
    const timestamp = buildTimestampSuffix(new Date(2026, 6, 3, 9, 5, 0));
    expect(timestamp).toBe("2026-07-03_0905");
  });

  it("builds descriptive export names from the original file name", () => {
    const exportName = buildExportName("Contract.PDF", "edited", new Date(2026, 6, 3, 9, 5, 0));
    expect(exportName).toBe("Contract_edited_2026-07-03_0905.pdf");
  });
});
