import { expect, it } from "vitest";
import { APICallError } from "ai";
import { getLlmProvider, safeLlmError } from "./provider.server";

it("missing Gemini credentials fail clearly without a fallback", () => expect(() => getLlmProvider({})).toThrow("GEMINI_API_KEY"));
it("uses only the selected free-tier model by default", () => expect(getLlmProvider({ apiKey: "test-only-credential" }).model).toBe("gemini-3.8-flash"));
it("rejects the legacy model unavailable to new Google projects", () => expect(() => getLlmProvider({ apiKey: "test-only-credential", model: "gemini-2.5-flash" })).toThrow("pricing review"));
it("rejects model overrides that have not been reviewed for free-tier use", () => expect(() => getLlmProvider({ apiKey: "test-only-credential", model: "gemini-2.5-pro" })).toThrow("pricing review"));
it.each([400, 401, 403, 404])("status %s is terminal", (statusCode) => {
  const error = new APICallError({ message: "private upstream detail", url: "https://example.invalid", requestBodyValues: {}, statusCode });
  const result = safeLlmError(error); expect(result.retryable).toBe(false); expect(result.status).toBe(statusCode); expect(result.message).not.toContain("private upstream detail");
});
it("rate limits surface safely", () => {
  expect(safeLlmError(new APICallError({ message: "rate limited", url: "https://example.invalid", requestBodyValues: {}, statusCode: 429 }))).toMatchObject({ status: 429, retryable: true });
});
it("service outages surface safely", () => {
  expect(safeLlmError(new APICallError({ message: "outage", url: "https://example.invalid", requestBodyValues: {}, statusCode: 503 }))).toMatchObject({ status: 503, retryable: true });
});