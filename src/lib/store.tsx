import { useContext, useMemo, useState, type ReactNode } from "react";
import { StoreContext } from "./store-context";
import { chunkDocument, type Chunk } from "./grounding";
import type { AssistantAnswer, ExtractedField } from "./types";
import type { ReviewDecision } from "./review-rules";

export interface PolicyDoc { id: string; name: string; text: string; chunks: Chunk[] }
export interface ChatMsg { id: string; role: "user" | "assistant"; text: string; answer?: AssistantAnswer; error?: string; retrieved?: number }
export interface ReviewItem { id: string; kind: "field" | "policy" | "processing"; title: string; reason: string; detail: string; severity: "missing" | "ambiguous" | "unsupported" | "low-confidence" | "insufficient-evidence" }
export type Resolution = ReviewDecision;

export interface Store {
  claim: { name: string; text: string } | null;
  setClaim: (c: { name: string; text: string } | null) => void;
  extraction: { fields: ExtractedField[]; model: string; at: string } | null;
  setExtraction: (e: Store["extraction"]) => void;
  policies: PolicyDoc[];
  addPolicy: (name: string, text: string) => void;
  removePolicy: (id: string) => void;
  messages: ChatMsg[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  resolutions: Record<string, Resolution>;
  resolve: (id: string, r: Resolution | null) => void;
  reviewItems: ReviewItem[];
  addFailure: (title: string, reason: string) => void;
  clearFailure: (title: string) => void;
  notes: Record<string, string>;
  saveNote: (id: string, note: string) => void;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [claim, setClaimState] = useState<Store["claim"]>(null);
  const [extraction, setExtractionState] = useState<Store["extraction"]>(null);
  const [policies, setPolicies] = useState<PolicyDoc[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [failures, setFailures] = useState<ReviewItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reviewItems = useMemo<ReviewItem[]>(() => {
    const items: ReviewItem[] = [...failures];
    extraction?.fields.forEach((f) => {
      const sev = f.status === "found" ? (f.confidence === "low" ? "low-confidence" : null) : f.status;
      if (sev) items.push({ id: `field:${f.key}`, kind: "field", title: f.label, severity: sev, reason: f.note, detail: f.value ? `Extracted: "${f.value}"` : "No value extracted" });
    });
    messages.forEach((m, i) => {
      if (m.error) items.push({ id: `policy:${m.id}`, kind: "processing", title: "Policy processing failed", severity: "unsupported", reason: m.error, detail: `Question: ${messages[i - 1]?.text ?? ""}` });
      if (m.role === "assistant" && m.answer && !m.answer.sufficient) {
        const q = messages[i - 1]?.text ?? "";
        items.push({ id: `policy:${m.id}`, kind: "policy", title: "Policy question", severity: "insufficient-evidence", reason: m.answer.answer, detail: `Question: "${q}"` });
      }
    });
    return items;
  }, [extraction, messages, failures]);

  const value: Store = {
    claim,
    setClaim: (c) => { setClaimState(c); setExtractionState(null); setResolutions((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("field:")))); setNotes((n) => Object.fromEntries(Object.entries(n).filter(([k]) => !k.startsWith("field:")))); },
    extraction, setExtraction: (e) => {
      setExtractionState(e);
      setResolutions((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("field:"))));
      setNotes((n) => Object.fromEntries(Object.entries(n).filter(([k]) => !k.startsWith("field:"))));
    },
    policies,
    addPolicy: (name, text) => {
      const id = `doc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      setPolicies((p) => [...p, { id, name, text, chunks: chunkDocument(id, name, text) }]);
    },
    removePolicy: (id) => setPolicies((p) => p.filter((d) => d.id !== id)),
    messages, setMessages,
    resolutions,
    resolve: (id, r) => setResolutions((prev) => { const n = { ...prev }; if (r) n[id] = r; else delete n[id]; return n; }),
    reviewItems,
    notes, saveNote: (id, note) => setNotes((n) => ({ ...n, [id]: note })),
    addFailure: (title, reason) => setFailures((items) => [...items.filter((i) => i.title !== title), { id: `processing:${title}`, kind: "processing", title, reason, detail: "Manual intervention required.", severity: "unsupported" }]),
    clearFailure: (title) => setFailures((items) => items.filter((i) => i.title !== title)),
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
