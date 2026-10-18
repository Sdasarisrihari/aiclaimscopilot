import { expect, it, vi } from "vitest";
import { decodeVin } from "./vin-service.server";

it("invalid VIN never calls the external service", async () => {
  const request = vi.fn(); expect((await decodeVin("ABC", request)).ok).toBe(false); expect(request).not.toHaveBeenCalled();
});
it("returns actual decoded Honda data from the service boundary", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({ Results: [{ Make: "HONDA", Model: "Accord", ModelYear: "2003", ErrorCode: "0" }] }));
  expect(await decodeVin("1HGCM82633A004352", request)).toMatchObject({ ok: true, data: { make: "HONDA", model: "Accord", year: "2003" } });
  expect(request.mock.calls[0]?.[0]).toContain("vpic.nhtsa.dot.gov");
});
it("rejects empty successful responses", async () => expect((await decodeVin("1HGCM82633A004352", vi.fn().mockResolvedValue(Response.json({ Results: [{}] })))).ok).toBe(false));
it("rejects unsuccessful decode codes", async () => expect((await decodeVin("1HGCM82633A004352", vi.fn().mockResolvedValue(Response.json({ Results: [{ Make: "HONDA", Model: "Accord", ErrorCode: "7" }] })))).ok).toBe(false));
it("service outage is an error, not fabricated vehicle details", async () => {
  const result = await decodeVin("1HGCM82633A004352", vi.fn().mockRejectedValue(new Error("network")));
  expect(result).toMatchObject({ ok: false, retryable: true }); expect(result).not.toHaveProperty("data");
});