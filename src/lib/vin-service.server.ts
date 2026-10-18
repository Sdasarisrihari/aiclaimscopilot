import { validateVin } from "./grounding";
import type { ServiceResult, VinResult } from "./types";

export async function decodeVin(raw: string, request: typeof fetch = fetch): Promise<ServiceResult<VinResult>> {
  const v = validateVin(raw);
  if (!v.ok) return { ok: false, error: v.error ?? "Invalid VIN.", retryable: false };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await request(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(v.vin)}?format=json`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) throw new Error("Temporary NHTSA failure");
        return { ok: false, error: "NHTSA could not process this VIN. Verify it manually.", retryable: false };
      }
      const payload = await response.json() as { Results?: Record<string, unknown>[] };
      const row = payload.Results?.[0];
      const value = (key: string) => typeof row?.[key] === "string" && String(row[key]).trim() ? String(row[key]).trim() : null;
      if (!row || !value("Make") || (!value("Model") && !value("ModelYear"))) return { ok: false, error: "NHTSA returned no usable vehicle details for this VIN. Verify the VIN manually.", retryable: false };
      const codes = (value("ErrorCode") ?? "").split(",").map((c) => c.trim());
      // Error 1 is a check-digit warning; retain partial real results with a visible warning. Other errors do not count as successful decoding.
      if (codes.some((code) => code !== "0" && code !== "1")) return { ok: false, error: "NHTSA could not fully decode this VIN. Verify it manually.", retryable: false };
      return { ok: true, data: { vin: v.vin, make: value("Make"), model: value("Model"), year: value("ModelYear"), bodyClass: value("BodyClass"), vehicleType: value("VehicleType"), decodeNote: codes.every((c) => c === "0") ? null : value("ErrorText") ?? "Partial decode: check digit could not be verified." } };
    } catch {
      if (attempt === 1) return { ok: false, error: "The NHTSA vehicle service is unavailable right now. Try again later or verify the vehicle manually.", retryable: true };
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return { ok: false, error: "NHTSA lookup failed.", retryable: true };
}