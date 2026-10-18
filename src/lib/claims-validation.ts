import { z } from "zod";
import { CLAIM_FIELDS, type ExtractedField, type AssistantAnswer } from "./types";
import { isVerbatim, validateVin, type Chunk } from "./grounding";

export const extractionSchema = z.object({ fields: z.array(z.object({
  key: z.string(), value: z.string().nullable(), evidence: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]), status: z.enum(["found", "missing", "ambiguous"]),
  availability: z.enum(["stated", "explicitly_missing", "not_stated", "cannot_determine"]), note: z.string(),
}).strict()) }).strict();
export const policySchema = z.object({ answer: z.string(), sufficient: z.boolean(), citations: z.array(z.object({ chunk_id: z.string(), quote: z.string() }).strict()) }).strict();

export function validateExtraction(raw: unknown, text: string): ExtractedField[] {
  const out = extractionSchema.parse(raw);
  const keys = new Set(out.fields.map((f) => f.key));
  if (keys.size !== out.fields.length || keys.size !== CLAIM_FIELDS.length || CLAIM_FIELDS.some((f) => !keys.has(f.key))) throw new Error("Incomplete or duplicate extraction fields.");
  return CLAIM_FIELDS.map(({ key, label }) => {
    const f = out.fields.find((field) => field.key === key);
    if (!f) throw new Error("Missing field.");
    const verified = isVerbatim(f.evidence, text);
    const absent = !f.value?.trim();
    const inconsistent = (f.status === "found" && (absent || f.availability !== "stated")) || (f.status === "missing" && !absent);
    const invalidVin = key === "vehicle_vin" && !absent && !validateVin(f.value ?? "").ok;
    // Preserve source wording for all values: a genuine but unrelated quote is not support.
    const unsupportedValue = !absent && !isVerbatim(f.value, f.evidence ?? "");
    const unsupported = inconsistent || invalidVin || unsupportedValue || (!absent && !verified) || (f.availability === "explicitly_missing" && !verified);
    return { ...f, label, value: unsupported ? null : f.value, evidence: verified ? f.evidence : null, verified,
      status: unsupported ? "unsupported" : f.status, confidence: unsupported ? "low" : f.confidence,
      note: unsupported ? "The returned value was invalid, inconsistent, or unsupported by the source. Manual verification is required." : f.note };
  });
}

export const INSUFFICIENT: AssistantAnswer = {
  sufficient: false, answer: "Coverage cannot be determined from the available documents. There is insufficient verified supporting evidence; please route this question to a human reviewer.", citations: [],
};

export function validatePolicyAnswer(raw: unknown, chunks: Pick<Chunk, "id" | "text" | "docName" | "reference">[]): AssistantAnswer {
  const out = policySchema.parse(raw);
  const citations = out.citations.flatMap((c) => {
    const source = chunks.find((chunk) => chunk.id === c.chunk_id);
    return source && isVerbatim(c.quote, source.text) ? [{ chunkId: source.id, docName: source.docName, ...(source.reference ? { reference: source.reference } : {}), quote: c.quote }] : [];
  });
  const droppedCitations = out.citations.length - citations.length;
  // One fabricated citation invalidates the whole answer, not just its citation list.
  if (!out.sufficient || !out.answer.trim() || !citations.length || droppedCitations > 0) return { ...INSUFFICIENT, droppedCitations };
  return { sufficient: true, answer: out.answer, citations, droppedCitations: 0 };
}