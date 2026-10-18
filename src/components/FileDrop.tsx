import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { readFileText } from "@/lib/read-file";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export function FileDrop({ onText, label, multiple }: { onText: (name: string, text: string) => void; label: string; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const { addFailure, clearFailure } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    for (const f of Array.from(files)) {
      try { onText(f.name, await readFileText(f)); clearFailure(`Document: ${f.name}`); } catch (e) { const message = e instanceof Error ? e.message : "Document processing failed."; setErr(`${f.name}: ${message}`); addFailure(`Document: ${f.name}`, message); }
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        className={cn("w-full rounded-lg border-2 border-dashed border-input bg-card p-6 text-center transition-colors hover:border-primary", over && "border-primary bg-accent")}>
        {busy ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : <Upload className="mx-auto h-6 w-6 text-primary" />}
        <div className="mt-2 text-sm font-medium">{busy ? "Reading file…" : label}</div>
        <div className="text-xs text-muted-foreground">PDF, TXT or MD · max 10 MB</div>
      </button>
      <input ref={ref} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
