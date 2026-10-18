import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { FileDrop } from "@/components/FileDrop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { SAMPLE_CLAIM, SAMPLE_POLICIES } from "@/lib/sample-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Intake — AI Claims Copilot" },
      { name: "description", content: "Upload synthetic P&C claim documents and sample policies for AI-assisted extraction and review." },
      { property: "og:title", content: "AI Claims Copilot — Intake" },
      { property: "og:description", content: "Evidence-grounded claim extraction and policy Q&A on synthetic demo data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Intake,
});

function Intake() {
  const { claim, setClaim, policies, addPolicy, removePolicy } = useStore();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const usePasted = () => {
    if (draft.trim().length < 40) return setErr("Paste at least a few sentences of claim text (40+ characters).");
    setErr(null); setClaim({ name: "pasted-claim.txt", text: draft.trim() }); setDraft("");
  };

  return (
    <AppShell>
      <PageHeader title="Claim intake" sub="Load a synthetic first-notice-of-loss and the sample policy documents the assistant may cite. Everything stays in this browser session." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-xl font-semibold">1 · Claim document</h2>
          {claim ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="font-medium truncate">{claim.name}</span><span className="text-muted-foreground">· {claim.text.length.toLocaleString()} chars</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClaim(null)}>Replace</Button></div>
              <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap font-mono">{claim.text}</pre>
              <Button asChild className="mt-4"><Link to="/extraction">Extract fields <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <FileDrop label="Upload claim PDF or text" onText={(name, text) => setClaim({ name, text })} />
              <div className="text-xs text-center text-muted-foreground">or paste text</div>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste synthetic claim notes…" rows={5} maxLength={60000} />
              {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={usePasted} disabled={!draft.trim()}>Use pasted text</Button>
                <Button variant="outline" onClick={() => setClaim(SAMPLE_CLAIM)}>Load synthetic sample</Button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-xl font-semibold">2 · Sample policy documents</h2>
          <div className="mt-4 space-y-4">
            <FileDrop multiple label="Upload policy PDFs or text" onText={addPolicy} />
            {policies.length === 0 ? (
              <Button variant="outline" onClick={() => SAMPLE_POLICIES.forEach((p) => addPolicy(p.name, p.text))}>Load synthetic sample policies</Button>
            ) : (
              <ul className="divide-y rounded-md border">
                {policies.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" /><span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{p.chunks.length} passages</span>
                    <Button variant="ghost" size="icon" className="ml-auto" aria-label={`Remove ${p.name}`} onClick={() => removePolicy(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
            {policies.length > 0 && <Button asChild variant="secondary"><Link to="/assistant">Ask the policy assistant <ArrowRight className="h-4 w-4" /></Link></Button>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
