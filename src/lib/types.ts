export const CLAIM_FIELDS = [
  { key: "claim_number", label: "Claim number" },
  { key: "policy_number", label: "Policy number" },
  { key: "insured_name", label: "Insured name" },
  { key: "date_of_loss", label: "Date of loss" },
  { key: "time_of_loss", label: "Time of loss" },
  { key: "loss_location", label: "Loss location" },
  { key: "loss_type", label: "Loss type" },
  { key: "loss_description", label: "Loss description" },
  { key: "vehicle_vin", label: "Vehicle VIN" },
  { key: "vehicle_description", label: "Vehicle" },
  { key: "other_party", label: "Other party" },
  { key: "police_report_number", label: "Police report #" },
  { key: "injuries_reported", label: "Injuries reported" },
  { key: "reported_damage", label: "Reported damage" },
  { key: "claimed_amount", label: "Claimed amount" },
] as const;

export type FieldStatus = "found" | "missing" | "ambiguous" | "unsupported";

export interface ExtractedField {
  key: string;
  label: string;
  value: string | null;
  evidence: string | null;
  confidence: "high" | "medium" | "low";
  status: FieldStatus;
  note: string;
  verified: boolean;
  availability?: "stated" | "explicitly_missing" | "not_stated" | "cannot_determine";
}

export interface Citation {
  chunkId: string;
  docName: string;
  quote: string;
  reference?: string;
}

export interface AssistantAnswer {
  sufficient: boolean;
  answer: string;
  citations: Citation[];
  droppedCitations?: number;
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; retryable: boolean };

export interface VinResult {
  vin: string;
  make: string | null;
  model: string | null;
  year: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  decodeNote: string | null;
}
