import { describe, expect, it } from "vitest";
import { validateTone } from "../src/index.js";

describe("validateTone", () => {
  it("accepts a valid tone", () => {
    expect(() => validateTone(">5")).not.toThrow();
  });

  it("rejects a tone without comparator", () => {
    expect(() => validateTone("10")).toThrow();
  });

  it("rejects a tone with '='", () => {
    expect(() => validateTone(">=10")).toThrow();
  });

  it("rejects multiple tones", () => {
    expect(() => validateTone([">5", "<10"])).toThrow();
  });
});
