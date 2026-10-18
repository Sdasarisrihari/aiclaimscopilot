# Gemini free-tier integration

## Current audit and release
- [x] Audit implementation and all tests; record verified gaps in QA report.
- [x] Fix confirmed VIN/evidence/stale-review defects without changing the UI or Gemini provider; 52 tests pass.
- [x] Recheck genuine extraction, policy answers, review decisions/rerun/escalation and NHTSA in preview.
- [x] Verify local release readiness and provide publication instructions in QA.md.
- [ ] Verify the published deployment and update final QA. Requires owner publication of the tested revision.

- [x] Diagnose exact HTTP 404: Google blocks gemini-2.5-flash generation for new users despite listing it.
- [x] Select documented free-tier gemini-3.8-flash; direct structured generation returns HTTP 200; preserve disabled billing.
- [x] Verify live extraction, changed-document results, cited policy answering and insufficient-evidence handling; 32 regression tests pass.

- [x] Preserve the five existing screens and repair store-context preview updates.
- [x] Confirm saved Gemini secret exists; verify authenticated model discovery and owner-confirmed Free tier.
- [x] Pin documented free-pricing gemini-3.8-flash; reject unreviewed overrides without paid fallback.
- [x] Reuse extraction/policy server functions, runtime schemas, exact citations and Review escalation.
- [x] Run 32 focused automated regression tests and successful live browser checks.
- [x] Document secret setup, app deployment, live test guide and honest verification limits.
- [x] Verify successful live extraction, changed-document results and cited policy answers with gemini-3.8-flash in preview. Published deployment remains unchanged until the owner publishes.
