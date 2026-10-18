import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StoreProvider, useStore, type Store } from "./store";
import { StoreContext } from "./store-context";
import { useContext } from "react";

function Consumer() {
  const store = useStore();
  const context = useContext(StoreContext);
  return <button onClick={() => store.setClaim({ name: "synthetic.txt", text: "Synthetic claim" })}>
    {context === store ? store.claim?.name ?? "No claim" : "Disconnected"}
  </button>;
}

it("provider and consumers share the stable context and receive state updates", () => {
  render(<StoreProvider><Consumer /></StoreProvider>);
  fireEvent.click(screen.getByRole("button", { name: "No claim" }));
  expect(screen.getByRole("button", { name: "synthetic.txt" })).toBeInTheDocument();
});

it("new extraction reopens field decisions and clears stale field notes without touching policy review", () => {
  let current: Store | undefined;
  function Capture() { current = useStore(); return null; }
  render(<StoreProvider><Capture /></StoreProvider>);
  act(() => {
    current?.resolve("field:police_report_number", { status: "resolved", note: "Old report", correction: "OLD-123", at: "2026-10-18T00:00:00Z" });
    current?.saveNote("field:police_report_number", "Old note");
    current?.resolve("policy:test", { status: "reviewed", note: "Policy note", at: "2026-10-18T00:00:00Z" });
  });
  expect(current?.resolutions["field:police_report_number"]?.status).toBe("resolved");
  act(() => current?.setExtraction({ fields: [], model: "gemini-3.8-flash", at: "2026-10-18T00:00:00Z" }));
  expect(current?.resolutions["field:police_report_number"]).toBeUndefined();
  expect(current?.notes["field:police_report_number"]).toBeUndefined();
  expect(current?.resolutions["policy:test"]?.status).toBe("reviewed");
});