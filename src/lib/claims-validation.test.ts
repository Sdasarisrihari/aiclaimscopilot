import { describe, expect, it } from "vitest";
import { CLAIM_FIELDS } from "./types";
import { validateExtraction, validatePolicyAnswer } from "./claims-validation";
import { chunkDocument, retrieve } from "./grounding";
import { SAMPLE_CLAIM, SAMPLE_POLICIES } from "./sample-data";
import { reviewDecision } from "./review-rules";

// Fixtures are model-output boundary inputs for automated validation, never app responses.
function fields() {
  return CLAIM_FIELDS.map(({ key }) => ({ key, value: null as string | null, evidence: null as string | null, confidence: "low", status: "missing", availability: "not_stated", note: "Not stated." }));
}
describe("extraction validation", () => {
  it("accepts known claim number only with actual source evidence", () => {
    const list = fields(); const first = list[0]; if (!first) throw new Error("Missing fixture field"); Object.assign(first, { value: "DEMO-CLM-2026-0042", evidence: "Claim Number: DEMO-CLM-2026-0042", confidence: "high", status: "found", availability: "stated" });
    expect(validateExtraction({ fields: list }, SAMPLE_CLAIM.text)[0]).toMatchObject({ value: "DEMO-CLM-2026-0042", verified: true, status: "found" });
  });
  it("preserves explicitly missing police report number", () => {
    const list = fields(); Object.assign(list.find((f) => f.key === "police_report_number") ?? {}, { availability: "explicitly_missing", evidence: "Report number to be provided later." });
    expect(validateExtraction({ fields: list }, SAMPLE_CLAIM.text).find((f) => f.key === "police_report_number")).toMatchObject({ status: "missing", value: null, availability: "explicitly_missing" });
  });
  it("preserves ambiguous time without inventing a specific time", () => {
    const list = fields(); Object.assign(list.find((f) => f.key === "time_of_loss") ?? {}, { status: "ambiguous", availability: "cannot_determine", evidence: "sometime in the early evening, maybe around 6 or 7" });
    expect(validateExtraction({ fields: list }, SAMPLE_CLAIM.text).find((f) => f.key === "time_of_loss")).toMatchObject({ status: "ambiguous", value: null });
  });
  it("rejects fabricated values even with a valid but unrelated quote", () => {
    const list = fields(); const first = list[0]; if (!first) throw new Error("Missing fixture field"); Object.assign(first, { value: "FAKE-123", evidence: "Claim Number: DEMO-CLM-2026-0042", status: "found", availability: "stated" });
    expect(validateExtraction({ fields: list }, SAMPLE_CLAIM.text)[0]).toMatchObject({ value: null, status: "unsupported" });
  });
  it.each(["insured_name", "date_of_loss", "loss_description"])("rejects fabricated %s paired with an unrelated real quote", (key) => {
    const list = fields();
    Object.assign(list.find((f) => f.key === key) ?? {}, { value: "Invented fact", evidence: "Claim Number: DEMO-CLM-2026-0042", status: "found", availability: "stated" });
    expect(validateExtraction({ fields: list }, SAMPLE_CLAIM.text).find((f) => f.key === key)).toMatchObject({ value: null, status: "unsupported", confidence: "low" });
  });
  it("accepts the claimed amount exactly as written, never a settlement", () => {
    const list = fields(); Object.assign(list.find((f) => f.key === "claimed_amount") ?? {}, { value: "$2,400", evidence: "Claimed amount: $2,400", status: "found", availability: "stated" });
    expect(validateExtraction({ fields: list }, "Claimed amount: $2,400").find((f) => f.key === "claimed_amount")?.value).toBe("$2,400");
  });
  it("rejects duplicate fields", () => { const list = fields(); const first = list[0]; if (!first) throw new Error("Missing fixture field"); list.push(first); expect(() => validateExtraction({ fields: list }, SAMPLE_CLAIM.text)).toThrow(); });
  it("rejects malformed structures", () => expect(() => validateExtraction({ fields: "invalid" }, SAMPLE_CLAIM.text)).toThrow());
});
describe("policy evidence", () => {
  const chunks = SAMPLE_POLICIES.flatMap((p, i) => chunkDocument(String(i), p.name, p.text));
  const source = retrieve("rental deductible", chunks).find((c) => c.docName.includes("rental"));
  it("accepts a cited passage from an actual loaded policy", () => {
    expect(source).toBeDefined();
    expect(validatePolicyAnswer({ answer: "The endorsement says no deductible applies.", sufficient: true, citations: [{ chunk_id: source?.id, quote: "without application of a deductible" }] }, chunks).sufficient).toBe(true);
  });
  it("safely escalates insufficient evidence", () => expect(validatePolicyAnswer({ answer: "unknown", sufficient: false, citations: [] }, chunks).sufficient).toBe(false));
  it("rejects a fabricated citation even if another quote is valid", () => {
    const answer = validatePolicyAnswer({ answer: "Boat coverage is included.", sufficient: true, citations: [{ chunk_id: source?.id, quote: "without application of a deductible" }, { chunk_id: "made-up", quote: "boats are covered" }] }, chunks);
    expect(answer).toMatchObject({ sufficient: false, citations: [], droppedCitations: 1 });
  });
  it("retains page references", () => expect(chunkDocument("pdf", "policy.pdf", "Page one\fPage two")[1]?.reference).toBe("page 2"));
});
describe("review decisions", () => {
  it("a note without a verified correction cannot resolve a missing field", () => expect(() => reviewDecision("resolved", "Waiting for police report", "", true)).toThrow());
  it("reviewed remains separate from resolved", () => expect(reviewDecision("reviewed", "Called insured", "", true).status).toBe("reviewed"));
  it("a supplied verified correction permits explicit resolution", () => expect(reviewDecision("resolved", "Verified report", "POL-123", true)).toMatchObject({ status: "resolved", correction: "POL-123" }));
  it("dismissal requires a note", () => expect(() => reviewDecision("dismissed", "", "", false)).toThrow());
});