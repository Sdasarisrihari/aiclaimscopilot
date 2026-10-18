# AI Claims Copilot — audit and release QA

## Gap analysis — 2026-10-18

| Area | Status at audit | Evidence / highest-priority work |
| --- | --- | --- |
| Gemini extraction and policy Q&A | Verified previously; recheck pending | Shared direct Google provider pins gemini-3.8-flash; prior upstream HTTP 200 and browser results. Preserve provider, timeouts, retries and billing. |
| Automated suite | Verified | All 41 tests across 6 files passed before changes, including previously omitted grounding tests. These are boundary tests, not accuracy metrics. |
| VIN response handling | Confirmed defect | Live lookupVin duplicates logic and accepts empty/failed decoded rows; tests cover a separate stricter decodeVin service. Wire live handler to tested service. |
| Extraction evidence | Confirmed defect | Non-atomic values can pass with an unrelated genuine quote. Require every nonempty extracted value to occur in its verified evidence; preserve missing/ambiguous escalation. |
| Review on extraction rerun | Confirmed defect | Stable field IDs retain old closed decisions when new extraction results arrive. Invalidate field decisions/notes on a new result. |
| Policy citation entailment | Incomplete safeguard, documented limitation | Exact quote/document verification is deterministic; it does not prove each paraphrased answer is entailed. Do not claim semantic accuracy. Human review remains required; no extra AI judge/billing introduced. |
| Reviewer corrections | Incomplete presentation | Corrections are separate human decisions, not AI evidence. Original extraction remains unchanged; retain provenance rather than silently relabel human data as AI-verified. |
| File processing | Partially tested | Size/page/text safeguards exist; PDF extraction is text-only, not OCR. No PDF browser fixture coverage yet. |
| Session state | Intended limitation | Refresh clears documents, notes and decisions. No durable storage/auth introduced. |
| Published deployment | Blocked on publication | Local preview verification is not proof of deployed behavior. Owner must publish/update the tested revision before deployed QA. |

## Execution

Fix only confirmed defects above, add regression tests, rerun the complete suite, then exercise actual extraction, policy Q&A, Review and NHTSA in the preview. Do not infer production success from local tests.

## Publication checklist

1. Keep Google AI Studio on Free tier; do not enable billing. Revoke any key previously shared in chat.
2. GEMINI_API_KEY must be stored securely; GEMINI_MODEL should be unset or gemini-3.8-flash.
3. In Lovable, open Publish at the top right, review visibility, and choose Update for the existing published site.
4. This TanStack app deploys its server functions/provider and secret snapshot with the app publication. No separate Edge Function deployment or migration is needed.
5. After publication, repeat extraction with two synthetic documents, cited policy Q&A, unsupported-question Review escalation, and valid/invalid VIN checks at https://ai-claims-copilot.lovable.app. Record actual results below; do not call publication verified until those checks pass.

## Post-fix results

### Automated — 2026-10-18

- **52 tests passed across 7 files** (`bunx vitest run`). Baseline was 41 across 6 files.
- New checks reject fabricated non-atomic field values with unrelated real evidence, invalidate stale field review decisions/notes, exercise the actual VIN handler against empty/error records and invalid input, and match all five routes.
- Latest preview compilation: **build OK**. A missing timestamp in a new test fixture was corrected before completion.

### Genuine live preview — 2026-10-18

- **Extraction passed:** gemini-3.8-flash returned the sample's claim/policy numbers and actual quotes; time remained ambiguous, report explicitly missing, and claimed amount absent.
- **Review passed:** saving a note did not resolve the police-report field; resolution without a correction was rejected; an explicit synthetic correction permitted resolution.
- **Extraction rerun passed:** the prior police-report resolution and note were removed and the new gap reopened.
- **Policy answering passed:** rental deductible question displayed the actual endorsement quote and its document/passage reference.
- **Unsupported question passed:** boats received insufficient evidence and appeared in Review.
- **NHTSA passed:** 1HGCM82633A004352 returned Honda Accord, 2003; ABC was rejected without an API call.
- Browser recorded **zero page errors**, **zero direct Google requests**, and five same-origin server-function responses with HTTP 200. Those are app RPC statuses, not measured upstream Google statuses in this run. The earlier direct provider test measured Google HTTP 200 separately.
- Screenshots inspected for extraction, policy citation and VIN result. No UI redesign or Gemini provider/model/retry/timeout change; no billing changes.

### Remaining gaps and release decision

- Ready for owner publication based on local tests and clean preview compilation; hosted deployment/runtime/security outcomes remain unverified until publication.
- Policy answer-to-quote semantic entailment is not proven by exact matching. Human review is still required; no accuracy percentage is claimed.
- Human corrections remain separate review decisions; they do not overwrite or become AI-verified extraction evidence.
- PDF fixture/OCR testing and durable storage are not completed; OCR and persistence are outside this session-only MVP. No new authentication or database was added.
- Public AI functions have no app-level authentication/quota gate in this MVP. Before broad public use, decide whether access should be restricted; free provider quotas do not constitute per-user abuse protection. No access-policy change was made without approval.

### Changed files

`src/lib/vin.functions.ts`, `src/lib/vin.functions.test.ts`, `src/lib/claims-validation.ts`, `src/lib/claims-validation.test.ts`, `src/lib/store.tsx`, `src/lib/store.test.tsx`, `src/test/app-routing.test.tsx`, `AGENTS.md`, `README.md`, `roadmap.md`, `QA.md`.

## Deployed QA

Pending owner publication of the tested revision. No new deployment has been performed by this audit.