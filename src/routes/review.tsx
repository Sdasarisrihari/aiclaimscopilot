import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/Pills";
import { useStore, type ReviewItem } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { reviewDecision, type ReviewStatus } from "@/lib/review-rules";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review queue — AI Claims Copilot" },
      { name: "description", content: "Human review of missing, ambiguous or unsupported claim information." },
      { property: "og:title", content: "Human review queue — AI Claims Copilot" },
      { property: "og:description", content: "Every gap the AI couldn't verify, routed to a person." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Review,
});

function Review() {
  const { reviewItems, resolutions } = useStore();
  const open = reviewItems.filter((i) => !resolutions[i.id] || resolutions[i.id]?.status === "reviewed");
  const done = reviewItems.filter((i) => resolutions[i.id]?.status === "resolved" || resolutions[i.id]?.status === "dismissed");
  return (
    <AppShell>
      <PageHeader title="Human review queue" sub="Items the AI could not verify against source text. Reviewer notes are kept for this session only." />
      {reviewItems.length === 0 && <p className="text-muted-foreground">Nothing to review yet. Run an extraction or ask the policy assistant.</p>}
      {open.length > 0 && <h2 className="text-lg font-semibold mb-3">Open · {open.length}</h2>}
      <ul className="space-y-3">{open.map((i) => <Row key={i.id} item={i} />)}</ul>
      {done.length > 0 && <><h2 className="text-lg font-semibold mt-8 mb-3">Closed · {done.length}</h2><ul className="space-y-3">{done.map((i) => <Row key={i.id} item={i} />)}</ul></>}
    </AppShell>
  );
}

function Row({ item }: { item: ReviewItem }) {
  const { resolutions, resolve, notes, saveNote } = useStore();
  const r = resolutions[item.id];
  const [note, setNote] = useState(notes[item.id] ?? r?.note ?? "");
  const [correction, setCorrection] = useState(r?.correction ?? "");
  const [err, setErr] = useState("");
  const requiresCorrection = item.kind === "field" && item.severity !== "low-confidence";
  const act = (status: ReviewStatus) => {
    try { const decision = reviewDecision(status, note, correction, requiresCorrection); saveNote(item.id, note); resolve(item.id, decision); setErr(""); }
    catch (e) { setErr(e instanceof Error ? e.message : "Review update failed."); }
  };
  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.title}</span><Pill value={item.severity} />
        <span className="text-xs text-muted-foreground">{item.kind === "field" ? "Claim field" : "Policy assistant"}</span>
        {r && <span className="ml-auto text-xs font-semibold uppercase text-success">{r.status}</span>}</div>
      <p className="mt-2 text-sm">{item.reason}</p>
      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
      {r && r.status !== "reviewed" ? (
        <div className="mt-3 flex items-start gap-3 text-sm">{r.note && <p className="flex-1 rounded bg-muted p-2">{r.note}</p>}
          <Button size="sm" variant="ghost" onClick={() => resolve(item.id, null)}>Reopen</Button></div>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => { setNote(e.target.value); setErr(""); }} placeholder="Reviewer note (what you verified and where)…" />
          {requiresCorrection && <Input aria-label={`Verified value for ${item.title}`} value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="Verified missing or corrected value" />}
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => saveNote(item.id, note)}>Save note</Button><Button size="sm" variant="outline" onClick={() => act("reviewed")}>Mark reviewed</Button><Button size="sm" onClick={() => act("resolved")}>Mark resolved</Button><Button size="sm" variant="outline" onClick={() => act("dismissed")}>Dismiss</Button></div>
        </div>
      )}
    </li>
  );
}
