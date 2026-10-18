import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpenText, Loader2, SendHorizontal, AlertTriangle, ShieldAlert } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type ChatMsg } from "@/lib/store";
import { retrieve } from "@/lib/grounding";
import { askPolicy } from "@/lib/claims.functions";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Policy assistant — AI Claims Copilot" },
      { name: "description", content: "Ask questions about sample policy documents and get answers with exact cited passages." },
      { property: "og:title", content: "Policy assistant — AI Claims Copilot" },
      { property: "og:description", content: "Answers grounded in verbatim policy citations, with a safe fallback when evidence is insufficient." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const uid = () => Math.random().toString(36).slice(2);

function Assistant() {
  const { policies, messages, setMessages } = useStore();
  const ask = useServerFn(askPolicy);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [busy]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (question: string, replaceId?: string) => {
    const text = question.trim();
    if (text.length < 3 || busy) return;
    const chunks = retrieve(text, policies.flatMap((p) => p.chunks));
    const aid = replaceId ?? uid();
    if (!replaceId) setMessages((m) => [...m, { id: uid(), role: "user", text }]);
    else setMessages((m) => m.filter((x) => x.id !== replaceId));
    setQ(""); setBusy(true);
    let msg: ChatMsg;
    try {
      const r = await ask({ data: { question: text, documents: policies.map((p) => ({ id: p.id, name: p.name, text: p.text })) } });
      msg = r.ok ? { id: aid, role: "assistant", text: r.data.answer, answer: r.data, retrieved: chunks.length } : { id: aid, role: "assistant", text: "", error: r.error };
    } catch {
      msg = { id: aid, role: "assistant", text: "", error: "Couldn't reach the server. Check your connection and retry." };
    }
    setMessages((m) => [...m, msg]); setBusy(false);
  };

  if (!policies.length) return (
    <AppShell><PageHeader title="Policy assistant" sub="Upload sample policy documents first so the assistant has something to cite." />
      <Button asChild><Link to="/">Go to intake</Link></Button></AppShell>
  );

  return (
    <AppShell>
      <PageHeader title="Policy assistant" sub={`Searching ${policies.length} document${policies.length > 1 ? "s" : ""}. Answers describe policy text only — never coverage decisions.`} />
      <div className="flex flex-col rounded-xl border bg-card min-h-[60vh]">
        <div className="flex-1 space-y-6 p-4 md:p-6 overflow-y-auto max-h-[65vh]">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Try: “What are the insured's duties after an accident?” or “Is rental reimbursement subject to a deductible?”</p>}
          {messages.map((m, i) => m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{m.text}</div>
          ) : (
            <div key={m.id} className="flex gap-3 max-w-[95%]">
              <BookOpenText className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 text-sm space-y-3">
                {m.error ? (
                  <div role="alert" className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />{m.error}
                    <Button size="sm" variant="outline" onClick={() => send(messages[i - 1]?.text ?? "", m.id)}>Retry</Button></div>
                ) : m.answer && !m.answer.sufficient ? (
                  <div className="rounded-md border border-warning bg-muted p-3"><div className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4 text-warning" />Insufficient evidence</div>
                    <p className="mt-1">{m.answer.answer}</p><Link to="/review" className="mt-1 inline-block text-xs underline text-primary">Added to review queue</Link></div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    <div className="space-y-2">
                      {m.answer?.citations.map((c, j) => (
                        <blockquote key={j} className="evidence-mark rounded px-3 py-2 text-xs">“{c.quote}”<div className="mt-1 font-sans text-[11px] text-muted-foreground">{c.docName} · {c.reference ?? `passage ${c.chunkId.split("#")[1]}`}</div></blockquote>
                      ))}
                    </div>
                    {!!m.answer?.droppedCitations && <p className="text-[11px] text-muted-foreground">{m.answer.droppedCitations} citation(s) removed because they did not match the source text.</p>}
                  </>
                )}
                {m.retrieved !== undefined && <p className="text-[11px] text-muted-foreground">{m.retrieved > 0 ? "Gemini response" : "No matching evidence"} · {m.retrieved} passage{m.retrieved === 1 ? "" : "s"} retrieved</p>}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching policies and drafting a cited answer…</div>}
          <div ref={endRef} />
        </div>
        <form className="border-t p-3 flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); send(q); }}>
          <Textarea ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} rows={2} maxLength={1000} placeholder="Ask about the sample policies…" className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q); } }} />
          <Button type="submit" size="icon" disabled={busy || q.trim().length < 3} aria-label="Send">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}</Button>
        </form>
      </div>
    </AppShell>
  );
}
