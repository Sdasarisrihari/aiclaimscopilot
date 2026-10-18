import { describe, expect, it } from "vitest";
import { isVerbatim, retrieve, chunkDocument, validateVin } from "./grounding";

describe("evidence verification", () => {
  it("accepts a verbatim quote with layout whitespace differences", () => {
    expect(isVerbatim("struck  from behind", "was struck from behind by another")).toBe(true);
  });
  it("rejects altered words or capitalization", () => expect(isVerbatim("struck from BEHIND", "struck from behind")).toBe(false));
  it("rejects a quote not in source", () => {
    expect(isVerbatim("vehicle was totaled", "rear bumper crushed")).toBe(false);
  });
  it("rejects empty evidence", () => {
    expect(isVerbatim(null, "anything")).toBe(false);
  });
});

describe("retrieval", () => {
  it("returns nothing when no terms match", () => {
    const c = chunkDocument("d", "d", "Collision coverage applies to direct loss.");
    expect(retrieve("helicopter pizza", c)).toEqual([]);
  });
  it("finds the matching passage", () => {
    const c = chunkDocument("d", "d", "Collision coverage applies.\n\n" + "x ".repeat(500) + "\n\nTransportation expenses without deductible.");
    expect(retrieve("transportation deductible", c)[0]?.text).toContain("Transportation");
  });
});

describe("VIN validation", () => {
  it("requires 17 chars", () => expect(validateVin("ABC").ok).toBe(false));
  it("rejects I, O, Q", () => expect(validateVin("1HGCM82633A00435O").ok).toBe(false));
  it("validates a real check digit", () => expect(validateVin("1HGCM82633A004352").checkDigitValid).toBe(true));
});
