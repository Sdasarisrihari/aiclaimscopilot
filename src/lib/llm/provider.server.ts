import { createGoogle } from "@ai-sdk/google";
import { streamText, Output, jsonSchema, APICallError, NoObjectGeneratedError } from "ai";

export class LlmError extends Error {
  constructor(message: string, public status: number, public retryable: boolean) { super(message); }
}
export interface StructuredRequest { system: string; user: string; schemaName: string; schema: Record<string, unknown> }
export interface LlmProvider { name: string; model: string; generateStructured<T>(req: StructuredRequest): Promise<T> }
export const FREE_TIER_MODEL = "gemini-3.8-flash";

export function safeLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (NoObjectGeneratedError.isInstance(error)) return new LlmError("The AI returned an invalid structured response. Manual review is required.", 422, false);
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 503;
    if (status === 400) return new LlmError("Gemini rejected the request. Check the configured model and document size.", status, false);
    if (status === 401) return new LlmError("The Gemini API key is missing or invalid. Ask the app owner to update its secure configuration.", status, false);
    if (status === 403) return new LlmError("Google denied access to Gemini. Check the API key's project permissions and API access.", status, false);
    if (status === 404) return new LlmError("Google returned HTTP 404: the configured Gemini model is unavailable to this project. Model listing alone does not establish generation access. Ask the app owner to review the supported free-tier model configuration.", status, false);
    if (status === 429) return new LlmError("Gemini's free request quota or rate limit was reached. Wait for the quota to reset; paid billing will not be enabled by this app.", status, true);
    return new LlmError("Gemini is temporarily unavailable. Try again later or review the documents manually.", status, status >= 500);
  }
  if (error instanceof Error && /abort|timeout/i.test(error.name + error.message)) return new LlmError("The AI request timed out. No result was substituted; retry manually or review the document.", 504, false);
  return new LlmError("The AI service could not complete this request. Please review the documents manually or retry later.", 503, true);
}

export class GeminiProvider implements LlmProvider {
  name = "google-gemini";
  constructor(private apiKey: string, public model: string) {}
  async generateStructured<T>(req: StructuredRequest): Promise<T> {
    const google = createGoogle({ apiKey: this.apiKey });
    let streamError: unknown;
    try {
      const result = streamText({
        model: google(this.model), system: req.system, prompt: req.user,
        output: Output.object({ name: req.schemaName, schema: jsonSchema<T>(req.schema) }),
        timeout: 120_000, maxRetries: 2,
        onError: ({ error }) => { streamError = error; },
      });
      const output = await result.output;
      if (streamError) throw streamError;
      if (await result.finishReason === "content-filter") throw new LlmError("Gemini declined this request under its safety policy. Manual review is required.", 422, false);
      return output;
    } catch (error) {
      const safe = safeLlmError(streamError ?? error);
      // Never log upstream bodies, prompts, headers or credentials.
      console.error("Gemini request failed", { model: this.model, status: safe.status, retryable: safe.retryable });
      throw safe;
    }
  }
}

// Configuration is supplied only by server-function handlers; no environment reads at module scope.
export function getLlmProvider(config: { apiKey?: string | undefined; model?: string | undefined }): LlmProvider {
  if (!config.apiKey) throw new LlmError("Gemini is not configured. Ask the app owner to add GEMINI_API_KEY securely.", 401, false);
  if (config.model && config.model !== FREE_TIER_MODEL) throw new LlmError("This app is configured for gemini-3.8-flash on your confirmed free-tier project. Remove the GEMINI_MODEL override; other models require a separate pricing review.", 400, false);
  return new GeminiProvider(config.apiKey, FREE_TIER_MODEL);
}
