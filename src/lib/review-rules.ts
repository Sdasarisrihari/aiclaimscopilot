export type ReviewStatus = "reviewed" | "resolved" | "dismissed";
export interface ReviewDecision { status: ReviewStatus; note: string; at: string; correction?: string }
export function reviewDecision(status: ReviewStatus, note: string, correction: string, requiresCorrection: boolean): ReviewDecision {
  if (note.trim().length < 3) throw new Error("Add a reviewer note before changing the review status.");
  if (status === "resolved" && requiresCorrection && correction.trim().length < 1) throw new Error("Enter the verified missing or corrected value before resolving this field.");
  return { status, note: note.trim(), ...(correction.trim() ? { correction: correction.trim() } : {}), at: new Date().toISOString() };
}