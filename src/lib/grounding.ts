// Client-safe, pure helpers for evidence verification and retrieval.

export const normalize = (s: string) =>
  s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();

/** Verbatim comparison permits only layout whitespace differences, never changes to words or case. */
export function isVerbatim(quote: string | null | undefined, source: string): boolean {
  if (!quote || quote.trim().length < 3) return false;
  const layout = (s: string) => s.replace(/\s+/g, " ").trim();
  return layout(source).includes(layout(quote));
}

export interface Chunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  reference?: string;
}

export function chunkDocument(docId: string, docName: string, text: string, size = 900): Chunk[] {
  if (text.includes("\f")) return text.split("\f").flatMap((page, i) => chunkDocument(docId, docName, page, size).map((c, j) => ({ ...c, id: `${docId}#p${i + 1}-${j + 1}`, reference: `page ${i + 1}` })));
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) chunks.push({ id: `${docId}#${chunks.length + 1}`, docId, docName, text: cur.trim(), reference: `passage ${chunks.length + 1}` });
    cur = "";
  };
  for (const p of paras) {
    if (cur && cur.length + p.length > size) push();
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size) {
        cur = p.slice(i, i + size);
        push();
      }
    } else cur += (cur ? "\n\n" : "") + p;
  }
  push();
  return chunks;
}

const STOP = new Set("the a an of to and or in on for is are be by with this that it as at from any what does do my our we you your if under".split(" "));
const tokens = (s: string) => normalize(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((t) => t.length > 2 && !STOP.has(t));

/** BM25 keyword retrieval. Returns top-k chunks with score > 0. */
export function retrieve(query: string, chunks: Chunk[], k = 6): Chunk[] {
  const q = tokens(query);
  if (!q.length || !chunks.length) return [];
  const docs = chunks.map((c) => tokens(c.text));
  const avg = docs.reduce((a, d) => a + d.length, 0) / docs.length;
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = docs.length;
  const scored = docs.map((d, i) => {
    let s = 0;
    for (const t of q) {
      const f = d.filter((x) => x === t).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avg))));
    }
    return { c: chunks[i], s };
  });
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).flatMap((x) => x.c ? [x.c] : []);
}

const VIN_MAP: Record<string, number> = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const VIN_W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function validateVin(raw: string): { ok: boolean; vin: string; error?: string; checkDigitValid?: boolean } {
  const vin = raw.trim().toUpperCase();
  if (vin.length !== 17) return { ok: false, vin, error: "A VIN must be exactly 17 characters." };
  if (/[IOQ]/.test(vin)) return { ok: false, vin, error: "VINs never contain the letters I, O or Q." };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return { ok: false, vin, error: "Only letters and digits are allowed." };
  const sum = [...vin].reduce((a, ch, i) => a + (/\d/.test(ch) ? Number(ch) : (VIN_MAP[ch] ?? 0)) * (VIN_W[i] ?? 0), 0);
  const r = sum % 11;
  return { ok: true, vin, checkDigitValid: (r === 10 ? "X" : String(r)) === vin[8] };
}
