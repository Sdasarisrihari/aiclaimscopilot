import { afterEach, expect, it, vi } from "vitest";

// Exercise the actual handler body with a minimal RPC-builder test adapter.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: (validate: (input: unknown) => unknown) => ({
      handler: (handler: (input: { data: unknown }) => unknown) =>
        (input: { data: unknown }) => handler({ data: validate(input.data) }),
    }),
  }),
}));

import { lookupVin } from "./vin.functions";

afterEach(() => vi.unstubAllGlobals());

it("live VIN handler rejects empty NHTSA records", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ Results: [{}] })));
  expect(await lookupVin({ data: { vin: "1HGCM82633A004352" } })).toMatchObject({ ok: false, retryable: false });
});

it("live VIN handler rejects NHTSA failure code 7 even with real-looking fields", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ Results: [{ Make: "HONDA", Model: "Accord", ErrorCode: "7" }] })));
  expect(await lookupVin({ data: { vin: "1HGCM82633A004352" } })).toMatchObject({ ok: false, retryable: false });
});

it("live VIN handler rejects ABC without contacting NHTSA", async () => {
  const request = vi.fn(); vi.stubGlobal("fetch", request);
  expect(await lookupVin({ data: { vin: "ABC" } })).toMatchObject({ ok: false, retryable: false });
  expect(request).not.toHaveBeenCalled();
});