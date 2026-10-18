import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  high: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-destructive text-destructive-foreground",
  found: "bg-accent text-accent-foreground",
  missing: "bg-muted text-muted-foreground border border-input",
  ambiguous: "bg-warning text-warning-foreground",
  unsupported: "bg-destructive text-destructive-foreground",
  "low-confidence": "bg-warning text-warning-foreground",
  "insufficient-evidence": "bg-destructive text-destructive-foreground",
};

export function Pill({ value }: { value: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", STYLES[value] ?? "bg-muted")}>{value.replace("-", " ")}</span>;
}

export function ConfidenceBar({ value }: { value: "high" | "medium" | "low" }) {
  const n = value === "high" ? 3 : value === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} confidence`} title={`${value} confidence`}>
      {[1, 2, 3].map((i) => <span key={i} className={cn("h-2 w-4 rounded-sm", i <= n ? (n === 3 ? "bg-success" : n === 2 ? "bg-warning" : "bg-destructive") : "bg-muted")} />)}
    </span>
  );
}
