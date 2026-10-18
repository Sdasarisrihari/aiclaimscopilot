# AI Claims Copilot

An AI-powered insurance claims decision-support prototype built to demonstrate claim data extraction, policy document Q&A, API integration, and human-in-the-loop review.

## Features

- **Claim Extraction:** Extracts claim information from synthetic documents and provides supporting source quotes.
- **Policy Assistant:** Answers questions using retrieved policy passages and validates citations against source text.
- **Review Queue:** Flags missing or ambiguous information, unsupported questions, and processing failures for human review.
- **VIN Lookup:** Retrieves vehicle details through the NHTSA vPIC API.
- **Error Handling:** Displays clear errors and avoids fabricating results when an AI service is unavailable.

## Tech Stack

- React and TypeScript
- TanStack Start server functions
- Google Gemini API
- BM25 document retrieval
- NHTSA vPIC API
- Vitest
- Lovable

## Architecture

The frontend communicates with server-side functions that handle AI requests, validate results, retrieve policy passages, and call the NHTSA API.

The Gemini API key is stored as a server-side secret and is not exposed to the browser.

## Quality Assurance

- **Automated tests:** 52/52 passed across 7 test files, according to the latest reported test run.
- **Claim extraction:** Tested with synthetic documents and source-evidence validation.
- **VIN lookup:** Tested with valid, invalid, unknown, and check-digit-mismatch inputs.
- **Failure handling:** Verified that provider errors produce clear messages and Review Queue items instead of fabricated answers.
- **Policy Q&A:** Earlier successful checks demonstrated citations and unsupported-question escalation. Fresh live citation verification remains pending due to Gemini HTTP 503 errors.
- **Deployment:** The latest published version and deployed workflows still require verification.

## Business Value

The prototype explores how AI can support insurance operations by:

- Reducing manual claim data-entry effort.
- Making extracted information traceable to source documents.
- Helping users locate relevant policy passages.
- Routing uncertain cases to human reviewers.

These are evaluation goals, not measured business outcomes. Further testing is needed to quantify accuracy, review time, and operational benefits.

## Limitations

- Uses synthetic data only.
- Claims, results, notes, and review decisions are session-only and disappear after refresh.
- PDF processing is text-based and does not include OCR.
- Policy retrieval uses lexical BM25 search; human review remains necessary.
- Gemini availability and free-tier quotas may vary.
- The public demo does not currently have application-level authentication or per-user rate limiting.
- This is a decision-support prototype, not a production claims system. It does not make coverage decisions, approve claims, calculate settlements, score fraud, or send customer communications.

## Disclaimer

This project is an independent AI prototype built for demonstration and learning purposes. It is not intended for production insurance decisions or use with real customer data.
