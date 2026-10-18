import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { validateVin } from "@/lib/grounding";
import { lookupVin } from "@/lib/vin.functions";
import type { VinResult } from "@/lib/types";

export const Route = createFileRoute("/vin")({
  head: () => ({
    meta: [
      { title: "VIN lookup — AI Claims Copilot" },
      { name: "description", content: "Decode a vehicle VIN with the public NHTSA vPIC API." },
      { property: "og:title", content: "VIN lookup — AI Claims Copilot" },
      { property: "og:description", content: "Validated VIN decoding via NHTSA vPIC with clear outage handling." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vin,
});

function Vin() {
  const { extraction } = useStore();
  const extracted = extraction?.fields.find((f) => f.key === "vehicle_vin" && f.verified)?.value ?? "";
  const [vin, setVin] = useState(extracted.replace(/[^A-Za-z0-9]/g, ""));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<VinResult | null>(null);
  const [err, setErr] = useState<{ msg: string; retryable: boolean } | null>(null);
  const run = useServerFn(lookupVin);
  const v = vin ? validateVin(vin) : null;

  const go = async () => {
    if (!v?.ok) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await run({ data: { vin: v.vin } });
      if (r.ok) setRes(r.data); else setErr({ msg: r.error, retryable: r.retryable });
    } catch { setErr({ msg: "Couldn't reach the server. Try again.", retryable: true }); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <PageHeader title="VIN lookup" sub="Decodes manufacturer data from the public NHTSA vPIC database. This confirms what a VIN encodes — not ownership or coverage." />
      <form className="rounded-xl border bg-card p-5 max-w-xl" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <label htmlFor="vin" className="text-sm font-medium">Vehicle Identification Number</label>
        <div className="mt-2 flex gap-2">
          <Input id="vin" value={vin} maxLength={17} onChange={(e) => setVin(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="17 characters" className="font-mono tracking-wider" aria-invalid={v ? !v.ok : undefined} />
          <Button type="submit" disabled={!v?.ok || busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Decode</Button>
        </div>
        <div className="mt-2 text-xs min-h-4">
          {v && !v.ok && <span className="text-destructive">{v.error}</span>}
          {v?.ok && v.checkDigitValid === false && <span className="text-warning-foreground flex items-center gap-1"><Info className="h-3 w-3" />Check digit doesn't match (common for synthetic VINs) — decode may be partial.</span>}
          {!vin && extraction && !extracted && <span className="text-muted-foreground">No verified VIN in the extracted claim.</span>}
          {extracted && <span className="text-muted-foreground block">Pre-filled from verified claim evidence.</span>}
        </div>
      </form>

      {err && <div role="alert" className="mt-6 max-w-xl flex items-start gap-3 rounded-lg border border-destructive/40 bg-card p-4 text-sm"><AlertTriangle className="h-5 w-5 text-destructive shrink-0" /><span className="flex-1">{err.msg}</span>{err.retryable && <Button size="sm" variant="outline" onClick={go}>Retry</Button>}</div>}

      {res && (
        <div className="mt-6 max-w-xl rounded-xl border bg-card p-5">
          <div className="font-mono text-sm text-muted-foreground">{res.vin}</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {([["Year", res.year], ["Make", res.make], ["Model", res.model], ["Body", res.bodyClass], ["Type", res.vehicleType]] as const).map(([k, val]) => (
              <div key={k}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt><dd>{val ?? <span className="italic text-muted-foreground">Not returned</span>}</dd></div>
            ))}
          </dl>
          {res.decodeNote && <p className="mt-4 text-xs rounded bg-muted p-2">NHTSA note: {res.decodeNote}</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">Source: NHTSA vPIC (live)</p>
        </div>
      )}
    </AppShell>
  );
}
