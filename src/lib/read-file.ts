// Browser-only: reads .txt/.md/.pdf into plain text. pdfjs is loaded lazily.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function readFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 10 MB.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    const text = (await file.text()).trim();
    if (!text) throw new Error("The document contains no readable text.");
    return text;
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const doc = await task.promise;
    if (doc.numPages > 50) { await task.destroy(); throw new Error("PDFs over 50 pages are not supported; split the document before uploading."); }
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      pages.push(c.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join(""));
    }
    const text = pages.join("\f").trim();
    await task.destroy();
    if (text.length < 20) throw new Error("No readable text found in this PDF (scanned images aren't supported).");
    return text;
  }
  throw new Error("Unsupported file type. Use PDF, TXT or MD.");
}
