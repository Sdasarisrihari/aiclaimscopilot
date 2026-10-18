import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceBar, Pill } from "@/components/Pills";
import { useStore } from "@/lib/store";
import { extractClaim } from "@/lib/claims.functions";

export const Route = createFileRoute("/extraction")({
  head: () => ({
    meta: [
      { title: "Field extraction — AI Claims Copilot" },
      { name: "description", content: "Structured claim fields with verbatim source evidence and confidence indicators." },
      { property: "og:title", content: "Claim field extraction — AI Claims Copilot" },
      { property: "og:description", content: "Every extracted value is checked against a verbatim quote from the claim document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Extraction,
});

function Extraction() {
  const { claim, extraction, setExtraction, reviewItems, addFailure, clearFailure } = useStore();
  const run = useServerFn(extractClaim);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; retryable: boolean } | null>(null);

  const go = async () => {
    if (!claim) return;
    setLoading(true); setError(null); setExtraction(null);
    try {
      const r = await run({ data: { text: claim.text } });
      if (r.ok) { setExtraction({ ...r.data, at: new Date().toISOString() }); clearFailure("Claim extraction failed"); }
      else { setError({ msg: r.error, retryable: r.retryable }); addFailure("Claim extraction failed", r.error); }
    } catch {
      setError({ msg: "Couldn't reach the server. Check your connection and try again.", retryable: true });
      addFailure("Claim extraction failed", "Couldn't reach the server. Manual document review may be required.");
    } finally { setLoading(false); }
  };

  if (!claim) return (
    <AppShell><PageHeader title="Field extraction" sub="Upload a claim first." />
      <Button asChild><Link to="/">Go to intake</Link></Button></AppShell>
  );

  const flagged = reviewItems.filter((i) => i.kind === "field").length;

  return (
    <AppShell>
      <PageHeader title="Field extraction" sub="Values are only accepted when the AI's quoted evidence is found verbatim in the document. Anything else goes to human review." />
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button onClick={go} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : extraction ? <RefreshCw className="h-4 w-4" /> : null}{loading ? "Extracting…" : extraction ? "Re-run extraction" : "Run AI extraction"}</Button>
        <span className="text-sm text-muted-foreground truncate">Source: {claim.name}</span>
        {extraction && <span className="text-xs text-muted-foreground">Live AI result · {extraction.model} · {new Date(extraction.at).toLocaleTimeString()}</span>}
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-card p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 text-sm"><div className="font-medium">Extraction failed</div><div className="text-muted-foreground">{error.msg}</div></div>
          {error.retryable && <Button size="sm" variant="outline" onClick={go}>Retry</Button>}
        </div>
      )}

      {loading && !extraction && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}

      {!extraction && !loading && !error && <p className="text-muted-foreground">No extraction yet. Run the AI to populate fields — nothing is pre-filled or simulated.</p>}

      {extraction && (
        <>
          {flagged > 0 && <p className="mb-4 text-sm"><Link to="/review" className="underline text-primary">{flagged} field{flagged > 1 ? "s" : ""} sent to the review queue</Link></p>}
          <div className={loading ? "opacity-50 pointer-events-none" : ""}>
            <div className="hidden md:grid grid-cols-[160px_1fr_1.3fr_110px] gap-4 px-4 pb-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>Field</span><span>Value</span><span>Source evidence</span><span>Confidence</span>
            </div>
            <ul className="space-y-2">
              {extraction.fields.map((f) => (
                <li key={f.key} className="grid gap-2 md:grid-cols-[160px_1fr_1.3fr_110px] md:gap-4 rounded-lg border bg-card p-4">
                  <div className="text-sm font-medium flex md:block items-center gap-2">{f.label}<div className="md:mt-1"><Pill value={f.status} /></div></div>
                  <div className="text-sm">{f.value ?? <span className="text-muted-foreground italic">{f.availability === "explicitly_missing" ? "Explicitly unavailable" : f.status === "ambiguous" || f.status === "unsupported" ? "Cannot determine" : "Not stated"}</span>}
                    {f.note && f.status !== "found" && <div className="mt-1 text-xs text-muted-foreground">{f.note}</div>}</div>
                  <div>{f.evidence ? (
                    <blockquote className="evidence-mark rounded px-2 py-1 text-xs">
                      “{f.evidence}”
                      <span className="mt-1 flex items-center gap-1 font-sans text-[11px] text-muted-foreground">
                        {f.verified ? <><CheckCircle2 className="h-3 w-3 text-success" /> Verified in source</> : <><AlertTriangle className="h-3 w-3 text-destructive" /> Not found in source</>}
                      </span>
                    </blockquote>) : <span className="text-xs text-muted-foreground">—</span>}</div>
                  <div><ConfidenceBar value={f.confidence} /><div className="text-[11px] text-muted-foreground mt-1 capitalize">{f.confidence}</div></div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </AppShell>
  );
}
