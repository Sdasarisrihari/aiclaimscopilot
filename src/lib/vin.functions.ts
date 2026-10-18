import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ServiceResult, VinResult } from "./types";

export const lookupVin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ vin: z.string().max(32) }).parse(d))
  .handler(async ({ data }): Promise<ServiceResult<VinResult>> => {
    const { decodeVin } = await import("./vin-service.server");
    return decodeVin(data.vin);
  });
