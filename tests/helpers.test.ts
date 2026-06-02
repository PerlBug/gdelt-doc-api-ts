import { describe, expect, it } from "vitest";
import { formatDate } from "../src/index.js";

describe("formatDate", () => {
  it("returns string input as YYYYMMDD000000", () => {
    expect(formatDate("2020-01-01")).toBe("20200101000000");
  });

  it("converts a Date to the API format", () => {
    const date = new Date(2020, 0, 1, 12, 30, 30);
    expect(formatDate(date)).toBe("20200101123030");
  });
});
