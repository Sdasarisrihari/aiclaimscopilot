<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- LLM calls go only through `src/lib/llm/provider.server.ts` (`LlmProvider`), invoked from `*.functions.ts` server functions — keeps keys server-side and the provider swappable.
- Every AI evidence quote/citation must be verified verbatim server-side (`src/lib/grounding.ts`) before display — prevents invented facts.
- App state is session-only in `src/lib/store.tsx`; no database in the MVP.
- Keep the store context object in a separate client-safe module from its provider implementation so preview updates cannot disconnect consumers from their provider.
- Never add mock/simulated AI output; failures surface as errors with retry.
- The sole LLM provider uses the direct Gemini AI SDK with a credential supplied inside server-function handlers; no automatic provider fallback, so billing and failure semantics remain honest.
- Reject model overrides outside the explicitly reviewed free-tier selection; account tier must be confirmed separately because model discovery does not establish billing eligibility.
- Validate complete model outputs in client-safe validation helpers and fail closed when any policy citation is invalid; validation can be evaluated independently without paying for AI calls.
- Review notes and explicit review decisions are separate session-state records; field resolutions require a human-supplied correction so notes never resolve missing information implicitly.
- The VIN server function delegates to the tested decodeVin service so live response acceptance and regression coverage share one implementation.
- Every nonempty extracted value must appear in its verified source quote; new extraction results invalidate prior field review decisions so old corrections cannot close new gaps.
